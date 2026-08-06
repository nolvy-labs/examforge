FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src

COPY ["dotnet-tools.json", "./"]
COPY ["src/ExamForge.Api/ExamForge.Api.csproj", "src/ExamForge.Api/"]
COPY ["src/ExamForge.Application/ExamForge.Application.csproj", "src/ExamForge.Application/"]
COPY ["src/ExamForge.Domain/ExamForge.Domain.csproj", "src/ExamForge.Domain/"]
COPY ["src/ExamForge.Infrastructure/ExamForge.Infrastructure.csproj", "src/ExamForge.Infrastructure/"]

RUN dotnet restore "src/ExamForge.Api/ExamForge.Api.csproj" \
    && dotnet tool restore

FROM restore AS build
COPY . .
RUN dotnet build "src/ExamForge.Api/ExamForge.Api.csproj" \
    --configuration Release \
    --no-restore

FROM build AS migrations
ENTRYPOINT ["dotnet", "ef", "database", "update", "--project", "src/ExamForge.Infrastructure/ExamForge.Infrastructure.csproj", "--startup-project", "src/ExamForge.Api/ExamForge.Api.csproj", "--configuration", "Release", "--no-build"]

FROM build AS publish
RUN dotnet publish "src/ExamForge.Api/ExamForge.Api.csproj" \
    --configuration Release \
    --no-build \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=5001
EXPOSE 5001

RUN apt-get update \
    && apt-get install --yes --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

USER $APP_UID
ENTRYPOINT ["dotnet", "ExamForge.Api.dll"]