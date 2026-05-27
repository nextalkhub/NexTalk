FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app
EXPOSE 5004

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["NextTalk.Websocket.Gateway/NextTalk.Websocket.Gateway.csproj", "NextTalk.Websocket.Gateway/"]
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore "NextTalk.Websocket.Gateway/NextTalk.Websocket.Gateway.csproj"
COPY . .
WORKDIR "/src/NextTalk.Websocket.Gateway"
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish "./NextTalk.Websocket.Gateway.csproj" -c $BUILD_CONFIGURATION --no-restore -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "NextTalk.Websocket.Gateway.dll"]
