using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Services;

/// <summary>
/// Generates a Word (.docx) document for a department list, matching the
/// Calibri/Calibri Light template styling with numbered headings, tables,
/// conclusion points, and case entries.
/// </summary>
public class DepListWordExportService
{
    private int _h1Counter;
    private int _h2Counter;
    private int _h3Counter;

    /// <summary>
    /// Generate a .docx byte array from a fully-loaded DepartmentList entity.
    /// </summary>
    public byte[] GenerateDocx(
        DepartmentList depList,
        Dictionary<Guid, List<CaseConclusion>>? conclusionsByCaseId = null)
    {
        _h1Counter = 0;
        _h2Counter = 0;
        _h3Counter = 0;

        using var stream = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            // Add styles for proper formatting
            AddStyles(mainPart);

            // Add numbering definitions for bullet/ordered lists and conclusion lists
            AddNumberingDefinitions(mainPart);

            // Build the section tree
            var allSections = depList.Sections?.ToList() ?? new List<DepartmentListSection>();
            var roots = allSections.Where(s => s.ParentId == null).OrderBy(s => s.SortOrder);

            foreach (var section in roots)
            {
                RenderSection(body, section, allSections, depList, conclusionsByCaseId, 1);
            }

            // Page setup (A4, normal margins)
            body.AppendChild(new SectionProperties(
                new PageSize { Width = 11906, Height = 16838 }, // A4
                new PageMargin
                {
                    Top = 1440, Bottom = 1440, Left = 1440, Right = 1440,
                    Header = (UInt32Value)720u, Footer = (UInt32Value)720u
                }
            ));

            mainPart.Document.Save();
        }

        return stream.ToArray();
    }

    private void RenderSection(
        Body body,
        DepartmentListSection section,
        List<DepartmentListSection> allSections,
        DepartmentList depList,
        Dictionary<Guid, List<CaseConclusion>>? conclusionsByCaseId,
        int level)
    {
        var sectionType = section.TemplateSection?.SectionType ?? "";
        var headingStyle = section.TemplateSection?.HeadingStyle ?? "";

        // Render heading
        if (!string.IsNullOrEmpty(section.Title))
        {
            var headingText = section.Title;

            if (sectionType == "department_header")
            {
                // Department header: large, no numbering
                body.AppendChild(CreateStyledParagraph(headingText, "DeplisteOverskrift1", 32, true, false));
            }
            else
            {
                // Numbered heading based on style
                var numberedText = GetNumberedHeading(headingStyle, headingText);
                var fontSize = GetHeadingFontSize(headingStyle);
                var isUnderline = headingStyle == "Overskrift7";
                body.AppendChild(CreateStyledParagraph(numberedText, headingStyle, fontSize, true, isUnderline));
            }
        }

        // Classification box
        if (sectionType == "department_header" && depList.Template?.ClassificationText != null)
        {
            body.AppendChild(CreateClassificationBox(depList.Template.ClassificationText));
        }

        // Section content
        if (sectionType is "fixed_content" or "freetext" && !string.IsNullOrEmpty(section.ContentJson))
        {
            RenderTipTapContent(body, section.ContentJson);
        }

        // Case groups
        if (sectionType is "case_group" or "decisions_section" or "summary_section")
        {
            RenderCaseGroup(body, section, depList, conclusionsByCaseId);
        }

        // Figure
        if (sectionType == "figure_placeholder" && !string.IsNullOrEmpty(section.ContentJson))
        {
            RenderFigurePlaceholder(body, section.ContentJson);
        }

        // Render children
        var children = allSections
            .Where(s => s.ParentId == section.Id)
            .OrderBy(s => s.SortOrder);

        foreach (var child in children)
        {
            RenderSection(body, child, allSections, depList, conclusionsByCaseId, level + 1);
        }
    }

    private void RenderCaseGroup(
        Body body,
        DepartmentListSection section,
        DepartmentList depList,
        Dictionary<Guid, List<CaseConclusion>>? conclusionsByCaseId)
    {
        var config = ParseConfig(section.TemplateSection?.Config ?? section.ContentJson);
        var entries = (section.CaseEntries ?? new List<DepartmentListCaseEntry>())
            .OrderBy(e => e.SortOrder)
            .ToList();

        // Intro text
        if (config.TryGetValue("intro_text_template", out var introObj) && introObj is JsonElement introEl)
        {
            var template = introEl.GetString();
            if (!string.IsNullOrEmpty(template))
            {
                var introText = ResolveIntroText(template, entries, depList.Department?.Name ?? "");
                body.AppendChild(CreateBodyParagraph(introText));
            }
        }

        // Summary table
        if (config.TryGetValue("summary_table", out var tableObj) &&
            tableObj is JsonElement tableEl && tableEl.GetBoolean())
        {
            RenderSummaryTable(body, entries, depList.Department?.Code ?? "Dep");
        }

        // Subgroups
        var subgroups = GetSubgroups(config);
        if (subgroups.Count == 0)
        {
            // No subgroups, render all entries directly
            foreach (var entry in entries)
            {
                RenderCaseEntry(body, entry, config, depList.Department?.Code ?? "", conclusionsByCaseId);
            }
        }
        else
        {
            foreach (var sg in subgroups)
            {
                var sgEntries = entries.Where(e => e.Subgroup == sg.Value).ToList();
                if (!string.IsNullOrEmpty(sg.Title))
                {
                    body.AppendChild(CreateStyledParagraph(sg.Title, "Overskrift5", 24, true, false));
                }
                foreach (var entry in sgEntries)
                {
                    RenderCaseEntry(body, entry, config, depList.Department?.Code ?? "", conclusionsByCaseId);
                }
            }
        }
    }

    private void RenderCaseEntry(
        Body body,
        DepartmentListCaseEntry entry,
        Dictionary<string, object> config,
        string deptCode,
        Dictionary<Guid, List<CaseConclusion>>? conclusionsByCaseId)
    {
        // Heading
        var headingFormat = config.TryGetValue("heading_format", out var hfObj) && hfObj is JsonElement hfEl
            ? hfEl.GetString() ?? "{case_name}"
            : "{case_name}";

        var heading = headingFormat
            .Replace("{department_abbrev}", deptCode)
            .Replace("{priority}", entry.SortOrder.ToString())
            .Replace("{case_name}", entry.Case?.CaseName ?? "");

        body.AppendChild(CreateStyledParagraph(heading, "Overskrift7", 24, true, true));

        // Amount info
        var amount = entry.Case?.Amount;
        var finAmount = entry.Case?.FinAmount;

        if (amount.HasValue)
        {
            body.AppendChild(CreateBodyParagraph(
                $"{deptCode}s forslag: {FormatMillions(amount.Value)}", italic: true));
        }
        if (finAmount.HasValue)
        {
            body.AppendChild(CreateBodyParagraph(
                $"FINs tilråding: {FormatMillions(finAmount.Value)}", italic: true));
        }

        // Conclusion points
        var hasConclusion = config.TryGetValue("has_conclusion", out var hcObj) &&
            hcObj is JsonElement hcEl && hcEl.GetBoolean();

        if (hasConclusion && conclusionsByCaseId != null &&
            conclusionsByCaseId.TryGetValue(entry.CaseId, out var conclusions))
        {
            if (conclusions.Count > 0)
            {
                body.AppendChild(CreateBodyParagraph("Konklusjon:", bold: true));
                for (int i = 0; i < conclusions.Count; i++)
                {
                    var letter = (char)('a' + i);
                    var concText = $"{letter}) {conclusions[i].Text}";
                    body.AppendChild(CreateBodyParagraph(concText, bold: true));
                }
            }
        }
    }

    private void RenderSummaryTable(Body body, List<DepartmentListCaseEntry> entries, string deptCode)
    {
        var table = new Table();

        // Table properties
        var tblProps = new TableProperties(
            new TableBorders(
                new TopBorder { Val = BorderValues.Single, Size = 4, Color = "999999" },
                new BottomBorder { Val = BorderValues.Single, Size = 4, Color = "999999" },
                new LeftBorder { Val = BorderValues.Single, Size = 4, Color = "999999" },
                new RightBorder { Val = BorderValues.Single, Size = 4, Color = "999999" },
                new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = "999999" },
                new InsideVerticalBorder { Val = BorderValues.Single, Size = 4, Color = "999999" }
            ),
            new TableWidth { Type = TableWidthUnitValues.Pct, Width = "5000" }
        );
        table.AppendChild(tblProps);

        // Header row
        table.AppendChild(CreateTableRow(
            new[] { "Nr.", "Sak", $"{deptCode}s forslag", "FINs tilråding" },
            bold: true, shading: "E8E8E8"));

        // Data rows
        for (int i = 0; i < entries.Count; i++)
        {
            var e = entries[i];
            table.AppendChild(CreateTableRow(new[]
            {
                (i + 1).ToString(),
                e.Case?.CaseName ?? "",
                FormatAmountKroner(e.Case?.Amount),
                FormatAmountKroner(e.Case?.FinAmount)
            }));
        }

        // Sum row
        var totalAmount = entries.Sum(e => e.Case?.Amount ?? 0);
        var totalFin = entries.Sum(e => e.Case?.FinAmount ?? 0);
        table.AppendChild(CreateTableRow(new[]
        {
            "", "Sum", FormatAmountKroner(totalAmount), FormatAmountKroner(totalFin)
        }, bold: true));

        body.AppendChild(table);
        body.AppendChild(new Paragraph()); // Spacing after table
    }

    private void RenderTipTapContent(Body body, string contentJson)
    {
        try
        {
            using var jsonDoc = JsonDocument.Parse(contentJson);
            var root = jsonDoc.RootElement;

            if (root.TryGetProperty("content", out var content))
            {
                foreach (var block in content.EnumerateArray())
                {
                    RenderTipTapBlock(body, block);
                }
            }
            else if (root.ValueKind == JsonValueKind.String)
            {
                // Plain text fallback
                body.AppendChild(CreateBodyParagraph(root.GetString() ?? ""));
            }
        }
        catch (JsonException)
        {
            // If not valid JSON, treat as plain text
            body.AppendChild(CreateBodyParagraph(contentJson));
        }
    }

    private void RenderTipTapBlock(Body body, JsonElement block)
    {
        if (!block.TryGetProperty("type", out var typeProp)) return;
        var type = typeProp.GetString();

        switch (type)
        {
            case "paragraph":
                body.AppendChild(CreateTipTapParagraph(block));
                break;
            case "bulletList":
            case "orderedList":
                RenderTipTapList(body, block, type == "orderedList");
                break;
        }
    }

    private void RenderTipTapList(Body body, JsonElement list, bool ordered)
    {
        if (!list.TryGetProperty("content", out var items)) return;

        foreach (var item in items.EnumerateArray())
        {
            if (!item.TryGetProperty("content", out var itemContent)) continue;
            foreach (var block in itemContent.EnumerateArray())
            {
                var para = CreateTipTapParagraph(block);
                var pProps = para.GetFirstChild<ParagraphProperties>() ?? new ParagraphProperties();
                if (para.GetFirstChild<ParagraphProperties>() == null)
                    para.InsertAt(pProps, 0);

                pProps.AppendChild(new NumberingProperties(
                    new NumberingLevelReference { Val = 0 },
                    new NumberingId { Val = ordered ? 2 : 1 }
                ));
                body.AppendChild(para);
            }
        }
    }

    private Paragraph CreateTipTapParagraph(JsonElement block)
    {
        var para = new Paragraph();
        if (!block.TryGetProperty("content", out var inlines)) return para;

        foreach (var inline in inlines.EnumerateArray())
        {
            if (!inline.TryGetProperty("text", out var textProp)) continue;
            var text = textProp.GetString() ?? "";

            var runProps = new RunProperties();
            if (inline.TryGetProperty("marks", out var marks))
            {
                foreach (var mark in marks.EnumerateArray())
                {
                    var markType = mark.TryGetProperty("type", out var mt) ? mt.GetString() : null;
                    if (markType == "bold") runProps.AppendChild(new Bold());
                    if (markType == "italic") runProps.AppendChild(new Italic());
                    if (markType == "underline") runProps.AppendChild(new Underline { Val = UnderlineValues.Single });
                }
            }

            para.AppendChild(new Run(runProps, new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
        }

        return para;
    }

    private void RenderFigurePlaceholder(Body body, string configJson)
    {
        var config = ParseConfig(configJson);
        var caption = config.TryGetValue("caption", out var capObj) && capObj is JsonElement capEl
            ? capEl.GetString()
            : null;

        // In Word export, we note the figure placeholder
        body.AppendChild(CreateBodyParagraph("[Figur]", italic: true));
        if (!string.IsNullOrEmpty(caption))
        {
            body.AppendChild(CreateBodyParagraph(caption, italic: true, fontSize: 20));
        }
    }

    // ===== Helper methods =====

    private string GetNumberedHeading(string headingStyle, string text)
    {
        switch (headingStyle)
        {
            case "Deplisteoverskrift1":
                _h1Counter++;
                _h2Counter = 0;
                _h3Counter = 0;
                return $"{_h1Counter} {text}";
            case "Deplisteoverskrift2":
                _h2Counter++;
                _h3Counter = 0;
                return $"{_h1Counter}.{_h2Counter} {text}";
            case "Deplisteoverskrift3":
                _h3Counter++;
                return $"{_h1Counter}.{_h2Counter}.{_h3Counter} {text}";
            default:
                return text;
        }
    }

    private static int GetHeadingFontSize(string headingStyle) => headingStyle switch
    {
        "Deplisteoverskrift1" => 32, // 16pt
        "Deplisteoverskrift2" => 28, // 14pt
        "Deplisteoverskrift3" => 28, // 14pt
        "Overskrift5" => 24,         // 12pt
        "Overskrift7" => 24,         // 12pt
        _ => 24,
    };

    private static Paragraph CreateStyledParagraph(
        string text, string styleName, int fontSize, bool bold, bool underline)
    {
        var runProps = new RunProperties(
            new RunFonts { Ascii = "Calibri Light", HighAnsi = "Calibri Light" },
            new FontSize { Val = fontSize.ToString() }
        );

        if (bold) runProps.AppendChild(new Bold());
        if (underline) runProps.AppendChild(new Underline { Val = UnderlineValues.Single });

        var pProps = new ParagraphProperties(
            new SpacingBetweenLines { Before = "200", After = "100" }
        );

        return new Paragraph(pProps, new Run(runProps, new Text(text)));
    }

    private static Paragraph CreateBodyParagraph(
        string text, bool bold = false, bool italic = false, int fontSize = 24)
    {
        var runProps = new RunProperties(
            new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
            new FontSize { Val = fontSize.ToString() }
        );

        if (bold) runProps.AppendChild(new Bold());
        if (italic) runProps.AppendChild(new Italic());

        return new Paragraph(new Run(runProps, new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
    }

    private static Paragraph CreateClassificationBox(string text)
    {
        var runProps = new RunProperties(
            new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
            new FontSize { Val = "22" },
            new Bold(),
            new Color { Val = "CC0000" }
        );

        var pProps = new ParagraphProperties(
            new ParagraphBorders(
                new TopBorder { Val = BorderValues.Single, Size = 12, Color = "CC0000" },
                new BottomBorder { Val = BorderValues.Single, Size = 12, Color = "CC0000" },
                new LeftBorder { Val = BorderValues.Single, Size = 12, Color = "CC0000" },
                new RightBorder { Val = BorderValues.Single, Size = 12, Color = "CC0000" }
            ),
            new Justification { Val = JustificationValues.Center },
            new SpacingBetweenLines { Before = "200", After = "200" }
        );

        return new Paragraph(pProps, new Run(runProps, new Text(text.ToUpper())));
    }

    private static TableRow CreateTableRow(string[] cells, bool bold = false, string? shading = null)
    {
        var row = new TableRow();
        foreach (var cellText in cells)
        {
            var cellProps = new TableCellProperties(
                new TableCellWidth { Type = TableWidthUnitValues.Auto }
            );

            if (shading != null)
            {
                cellProps.AppendChild(new Shading
                {
                    Val = ShadingPatternValues.Clear, Color = "auto", Fill = shading
                });
            }

            var runProps = new RunProperties(
                new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                new FontSize { Val = "20" }
            );
            if (bold) runProps.AppendChild(new Bold());

            var cell = new TableCell(
                cellProps,
                new Paragraph(new Run(runProps, new Text(cellText) { Space = SpaceProcessingModeValues.Preserve }))
            );
            row.AppendChild(cell);
        }
        return row;
    }

    private static string FormatMillions(long amount)
    {
        var millions = amount / 1000.0;
        return $"{millions:N1} mill. kroner";
    }

    private static string FormatAmountKroner(long? amount)
    {
        if (!amount.HasValue) return "-";
        return amount.Value.ToString("N0");
    }

    private static string ResolveIntroText(string template, List<DepartmentListCaseEntry> entries, string deptName)
    {
        var aListEntries = entries.Where(e => e.Subgroup == "a_list").ToList();
        var totalAmount = aListEntries.Sum(e => e.Case?.FinAmount ?? e.Case?.Amount ?? 0);
        return template
            .Replace("{department_name}", deptName)
            .Replace("{total_amount}", FormatMillions(totalAmount))
            .Replace("{count}", aListEntries.Count.ToString());
    }

    private static Dictionary<string, object> ParseConfig(string? configStr)
    {
        if (string.IsNullOrEmpty(configStr)) return new Dictionary<string, object>();
        try
        {
            using var doc = JsonDocument.Parse(configStr);
            var result = new Dictionary<string, object>();
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                result[prop.Name] = prop.Value.Clone();
            }
            return result;
        }
        catch (JsonException)
        {
            return new Dictionary<string, object>();
        }
    }

    private static List<(string Value, string Title)> GetSubgroups(Dictionary<string, object> config)
    {
        if (!config.TryGetValue("subgroups", out var sgObj) || sgObj is not JsonElement sgEl)
            return new List<(string, string)>();

        if (sgEl.ValueKind != JsonValueKind.Array) return new List<(string, string)>();

        return sgEl.EnumerateArray().Select(sg =>
        {
            var value = sg.TryGetProperty("value", out var v) ? v.GetString() ?? "" : "";
            var title = sg.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
            return (value, title);
        }).ToList();
    }

    private static void AddStyles(MainDocumentPart mainPart)
    {
        var stylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
        var styles = new Styles();

        // Default style
        styles.AppendChild(new DocDefaults(
            new RunPropertiesDefault(new RunPropertiesBaseStyle(
                new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                new FontSize { Val = "24" }
            ))
        ));

        stylesPart.Styles = styles;
        stylesPart.Styles.Save();
    }

    private static void AddNumberingDefinitions(MainDocumentPart mainPart)
    {
        var numberingPart = mainPart.AddNewPart<NumberingDefinitionsPart>();
        var numbering = new Numbering();

        // Abstract numbering for bullets
        numbering.AppendChild(new AbstractNum(
            new Level(
                new NumberingFormat { Val = NumberFormatValues.Bullet },
                new LevelText { Val = "•" }
            ) { LevelIndex = 0 }
        ) { AbstractNumberId = 1 });

        // Abstract numbering for ordered list
        numbering.AppendChild(new AbstractNum(
            new Level(
                new NumberingFormat { Val = NumberFormatValues.Decimal },
                new LevelText { Val = "%1." }
            ) { LevelIndex = 0 }
        ) { AbstractNumberId = 2 });

        // Number instances
        numbering.AppendChild(new NumberingInstance(
            new AbstractNumId { Val = 1 }
        ) { NumberID = 1 });

        numbering.AppendChild(new NumberingInstance(
            new AbstractNumId { Val = 2 }
        ) { NumberID = 2 });

        numberingPart.Numbering = numbering;
        numberingPart.Numbering.Save();
    }
}
