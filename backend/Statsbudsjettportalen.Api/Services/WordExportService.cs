using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace Statsbudsjettportalen.Api.Services;

/// <summary>
/// Converts ProseMirror document JSON to a Word (.docx) file,
/// preserving tracked changes as Word revision marks and comments.
/// </summary>
public class WordExportService
{
    private const string DefaultAuthor = "Statsbudsjettportalen";

    /// <summary>
    /// Generate a .docx byte array from a ProseMirror content_json document.
    /// </summary>
    public byte[] GenerateDocx(
        string contentJson,
        string caseName,
        IReadOnlyList<CommentData>? comments = null)
    {
        using var stream = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            // Parse ProseMirror JSON
            using var jsonDoc = JsonDocument.Parse(contentJson);
            var root = jsonDoc.RootElement;

            // Add document title
            body.AppendChild(CreateHeading(caseName, 1));

            // Process sections
            if (root.TryGetProperty("content", out var sections))
            {
                foreach (var section in sections.EnumerateArray())
                {
                    ProcessSection(body, section, comments);
                }
            }

            // Add comments part if there are comments
            if (comments is { Count: > 0 })
            {
                AddCommentsPart(doc, comments);
            }

            mainPart.Document.Save();
        }

        return stream.ToArray();
    }

    private void ProcessSection(Body body, JsonElement section, IReadOnlyList<CommentData>? comments)
    {
        if (!section.TryGetProperty("content", out var children)) return;

        foreach (var child in children.EnumerateArray())
        {
            if (!child.TryGetProperty("type", out var typeProp)) continue;
            var type = typeProp.GetString();

            if (type == "sectionTitle")
            {
                var titleText = ExtractPlainText(child);
                body.AppendChild(CreateHeading(titleText, 2));
            }
            else if (type == "sectionContent")
            {
                if (!child.TryGetProperty("content", out var blocks)) continue;
                foreach (var block in blocks.EnumerateArray())
                {
                    ProcessBlock(body, block, comments);
                }
            }
        }
    }

    private void ProcessBlock(Body body, JsonElement block, IReadOnlyList<CommentData>? comments)
    {
        if (!block.TryGetProperty("type", out var typeProp)) return;
        var type = typeProp.GetString();

        switch (type)
        {
            case "paragraph":
                body.AppendChild(CreateParagraph(block, comments));
                break;
            case "bulletList":
                ProcessList(body, block, false, comments);
                break;
            case "orderedList":
                ProcessList(body, block, true, comments);
                break;
        }
    }

    private void ProcessList(Body body, JsonElement list, bool ordered, IReadOnlyList<CommentData>? comments)
    {
        if (!list.TryGetProperty("content", out var items)) return;

        foreach (var item in items.EnumerateArray())
        {
            if (!item.TryGetProperty("content", out var itemContent)) continue;
            foreach (var block in itemContent.EnumerateArray())
            {
                var para = CreateParagraph(block, comments);
                // Add bullet/number styling
                var pProps = para.GetFirstChild<ParagraphProperties>();
                if (pProps == null)
                {
                    pProps = new ParagraphProperties();
                    para.InsertAt(pProps, 0);
                }
                pProps.AppendChild(new NumberingProperties(
                    new NumberingLevelReference { Val = 0 },
                    new NumberingId { Val = ordered ? 2 : 1 }
                ));
                body.AppendChild(para);
            }
        }
    }

    private Paragraph CreateParagraph(JsonElement block, IReadOnlyList<CommentData>? comments)
    {
        var para = new Paragraph();

        if (!block.TryGetProperty("content", out var inlines))
            return para;

        foreach (var inline in inlines.EnumerateArray())
        {
            if (!inline.TryGetProperty("text", out var textProp)) continue;
            var text = textProp.GetString() ?? "";

            var marks = GetMarks(inline);
            var hasInsertion = marks.Any(m => m.type == "insertion");
            var hasDeletion = marks.Any(m => m.type == "deletion");
            var hasComment = marks.Any(m => m.type == "comment");
            var isBold = marks.Any(m => m.type == "bold");
            var isItalic = marks.Any(m => m.type == "italic");
            var isUnderline = marks.Any(m => m.type == "underline");

            var runProps = new RunProperties();
            if (isBold) runProps.AppendChild(new Bold());
            if (isItalic) runProps.AppendChild(new Italic());
            if (isUnderline) runProps.AppendChild(new Underline { Val = UnderlineValues.Single });

            if (hasInsertion)
            {
                // Word tracked insertion
                var insertionMark = marks.First(m => m.type == "insertion");
                var ins = new InsertedRun
                {
                    Author = new StringValue(insertionMark.authorName ?? DefaultAuthor),
                    Date = ParseTimestamp(insertionMark.timestamp),
                };
                var run = new Run(runProps, new Text(text) { Space = SpaceProcessingModeValues.Preserve });
                ins.AppendChild(run);
                para.AppendChild(ins);
            }
            else if (hasDeletion)
            {
                // Word tracked deletion
                var deletionMark = marks.First(m => m.type == "deletion");
                var del = new DeletedRun
                {
                    Author = new StringValue(deletionMark.authorName ?? DefaultAuthor),
                    Date = ParseTimestamp(deletionMark.timestamp),
                };
                var run = new Run(runProps, new DeletedText(text) { Space = SpaceProcessingModeValues.Preserve });
                del.AppendChild(run);
                para.AppendChild(del);
            }
            else
            {
                // Normal text
                var run = new Run(runProps, new Text(text) { Space = SpaceProcessingModeValues.Preserve });

                if (hasComment && comments != null)
                {
                    var commentMark = marks.First(m => m.type == "comment");
                    var matchingComment = comments.FirstOrDefault(c => c.CommentId == commentMark.commentId);
                    if (matchingComment != null)
                    {
                        // Add comment range start/end markers
                        var commentIdx = comments.IndexOf(matchingComment);
                        para.AppendChild(new CommentRangeStart { Id = new StringValue(commentIdx.ToString()) });
                        para.AppendChild(run);
                        para.AppendChild(new CommentRangeEnd { Id = new StringValue(commentIdx.ToString()) });
                        para.AppendChild(new Run(
                            new RunProperties(new RunStyle { Val = "CommentReference" }),
                            new CommentReference { Id = new StringValue(commentIdx.ToString()) }
                        ));
                        continue;
                    }
                }

                para.AppendChild(run);
            }
        }

        return para;
    }

    private void AddCommentsPart(WordprocessingDocument doc, IReadOnlyList<CommentData> comments)
    {
        var commentsPart = doc.MainDocumentPart!.AddNewPart<WordprocessingCommentsPart>();
        var commentsElement = new Comments();

        for (int i = 0; i < comments.Count; i++)
        {
            var c = comments[i];
            var comment = new Comment
            {
                Id = new StringValue(i.ToString()),
                Author = new StringValue(c.AuthorName),
                Date = ParseTimestamp(c.CreatedAt),
                Initials = new StringValue(GetInitials(c.AuthorName)),
            };
            comment.AppendChild(new Paragraph(
                new Run(new Text(c.CommentText) { Space = SpaceProcessingModeValues.Preserve })
            ));

            // Add replies as additional paragraphs
            if (c.Replies != null)
            {
                foreach (var reply in c.Replies)
                {
                    comment.AppendChild(new Paragraph(
                        new Run(
                            new RunProperties(new Bold()),
                            new Text(reply.AuthorName + ": ") { Space = SpaceProcessingModeValues.Preserve }
                        ),
                        new Run(
                            new Text(reply.CommentText) { Space = SpaceProcessingModeValues.Preserve }
                        )
                    ));
                }
            }

            commentsElement.AppendChild(comment);
        }

        commentsPart.Comments = commentsElement;
        commentsPart.Comments.Save();
    }

    private static Paragraph CreateHeading(string text, int level)
    {
        var para = new Paragraph(
            new ParagraphProperties(
                new ParagraphStyleId { Val = $"Heading{level}" }
            ),
            new Run(new Text(text))
        );
        return para;
    }

    private static string ExtractPlainText(JsonElement node)
    {
        if (node.TryGetProperty("text", out var textProp))
            return textProp.GetString() ?? "";

        var parts = new List<string>();
        if (node.TryGetProperty("content", out var content))
        {
            foreach (var child in content.EnumerateArray())
                parts.Add(ExtractPlainText(child));
        }
        return string.Join("", parts);
    }

    private static List<MarkInfo> GetMarks(JsonElement inline)
    {
        var result = new List<MarkInfo>();
        if (!inline.TryGetProperty("marks", out var marks)) return result;

        foreach (var mark in marks.EnumerateArray())
        {
            var type = mark.TryGetProperty("type", out var t) ? t.GetString() : null;
            if (type == null) continue;

            string? authorName = null;
            string? timestamp = null;
            string? commentId = null;

            if (mark.TryGetProperty("attrs", out var attrs))
            {
                if (attrs.TryGetProperty("authorName", out var an))
                    authorName = an.GetString();
                if (attrs.TryGetProperty("timestamp", out var ts))
                    timestamp = ts.GetString();
                if (attrs.TryGetProperty("commentId", out var ci))
                    commentId = ci.GetString();
            }

            result.Add(new MarkInfo(type, authorName, timestamp, commentId));
        }

        return result;
    }

    private static DateTimeValue ParseTimestamp(string? timestamp)
    {
        if (DateTime.TryParse(timestamp, out var dt))
            return new DateTimeValue(dt.ToUniversalTime());
        return new DateTimeValue(DateTime.UtcNow);
    }

    private static string GetInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join("", parts.Select(p => p[..1].ToUpper()));
    }

    private record MarkInfo(string type, string? authorName, string? timestamp, string? commentId);
}

/// <summary>
/// Comment data for Word export.
/// </summary>
public class CommentData
{
    public string CommentId { get; set; } = "";
    public string CommentText { get; set; } = "";
    public string AuthorName { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public List<CommentReplyData>? Replies { get; set; }
}

public class CommentReplyData
{
    public string CommentText { get; set; } = "";
    public string AuthorName { get; set; } = "";
}
