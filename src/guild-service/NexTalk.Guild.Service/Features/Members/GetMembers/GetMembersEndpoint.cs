using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Members.GetMembers;

public static class GetMembersEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds/{guildId:guid}/members", async (
            Guid guildId,
            GetMembersHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetMembersQuery(guildId), ct);
            return Results.Ok(result);
        })
        .WithTags("Members")
        .WithSummary("Список участников гильдии")
        .WithDescription("Возвращает всех участников гильдии с их ролями. Пользователь должен быть членом гильдии.")
        .Produces<MemberResponse[]>(200)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("guildId", "Идентификатор гильдии.")));
}
