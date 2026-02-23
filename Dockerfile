# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /app
COPY backend/Statsbudsjettportalen.Api/Statsbudsjettportalen.Api.csproj ./backend/Statsbudsjettportalen.Api/
RUN dotnet restore backend/Statsbudsjettportalen.Api/Statsbudsjettportalen.Api.csproj
COPY backend/ ./backend/
RUN dotnet publish backend/Statsbudsjettportalen.Api/Statsbudsjettportalen.Api.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Production runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# SIKKERHETSFIKSING: Kjør som non-root bruker for å begrense skadeomfang ved kompromittering.
RUN adduser --disabled-password --gecos "" --uid 1001 appuser

# Copy published backend
COPY --from=backend-build /app/publish .

# Copy frontend build to wwwroot
COPY --from=frontend-build /app/frontend/dist ./wwwroot/

# Opprett mapper som appuser trenger skrivetilgang til (eksporter, figurer)
RUN mkdir -p /app/wwwroot/exports /app/wwwroot/uploads && \
    chown -R appuser:appuser /app

# Azure Web App for Containers uses PORT env var (default 8080)
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
EXPOSE 8080

# Bytt til non-root bruker
USER appuser

# Health check for Azure
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "Statsbudsjettportalen.Api.dll"]
