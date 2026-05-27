FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["NexTalk.Guild.Service/NexTalk.Guild.Service.csproj", "NexTalk.Guild.Service/"]
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore "NexTalk.Guild.Service/NexTalk.Guild.Service.csproj"
COPY . .
WORKDIR "/src/NexTalk.Guild.Service"
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish "./NexTalk.Guild.Service.csproj" -c $BUILD_CONFIGURATION --no-restore -o /app/publish /p:UseAppHost=false
RUN dotnet tool install --global dotnet-ef --version 10.0.8 && \
    /root/.dotnet/tools/dotnet-ef migrations bundle \
      --project "./NexTalk.Guild.Service.csproj" \
      --self-contained -r linux-x64 \
      --output /app/publish/efbundle

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "NexTalk.Guild.Service.dll"]
