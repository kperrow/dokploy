import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	apiCreateGitlab,
	apiFindGitlabBranches,
	apiFindOneGitlab,
	apiGitlabTestConnection,
	apiUpdateGitlab,
} from "@/server/db/schema";

import { db } from "@/server/db";
import {
	IS_CLOUD,
	createGitlab,
	findGitlabById,
	getGitlabBranches,
	getGitlabRepositories,
	haveGitlabRequirements,
	testGitlabConnection,
	updateGitProvider,
	updateGitlab,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";

export const gitlabRouter = createTRPCRouter({
	create: protectedProcedure
		.input(apiCreateGitlab)
		.mutation(async ({ input, ctx }) => {
			try {
				return await createGitlab(input, ctx.user.ownerId);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error creating this Gitlab provider",
					cause: error,
				});
			}
		}),
	one: protectedProcedure
		.input(apiFindOneGitlab)
		.query(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId);
			if (IS_CLOUD && gitlabProvider.gitProvider.userId !== ctx.user.ownerId) {
				//TODO: Remove this line when the cloud version is ready
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			return gitlabProvider;
		}),
	gitlabProviders: protectedProcedure.query(async ({ ctx }) => {
		let result = await db.query.gitlab.findMany({
			with: {
				gitProvider: true,
			},
		});

		if (IS_CLOUD) {
			// TODO: mAyBe a rEfaCtoR 🤫
			result = result.filter(
				(provider) => provider.gitProvider.userId === ctx.user.ownerId,
			);
		}
		const filtered = result
			.filter((provider) => haveGitlabRequirements(provider))
			.map((provider) => {
				return {
					gitlabId: provider.gitlabId,
					gitProvider: {
						...provider.gitProvider,
					},
				};
			});

		return filtered;
	}),
	getGitlabRepositories: protectedProcedure
		.input(apiFindOneGitlab)
		.query(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId);
			if (IS_CLOUD && gitlabProvider.gitProvider.userId !== ctx.user.ownerId) {
				//TODO: Remove this line when the cloud version is ready
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			return await getGitlabRepositories(input.gitlabId);
		}),

	getGitlabBranches: protectedProcedure
		.input(apiFindGitlabBranches)
		.query(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId || "");
			if (IS_CLOUD && gitlabProvider.gitProvider.userId !== ctx.user.ownerId) {
				//TODO: Remove this line when the cloud version is ready
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			return await getGitlabBranches(input);
		}),
	testConnection: protectedProcedure
		.input(apiGitlabTestConnection)
		.mutation(async ({ input, ctx }) => {
			try {
				const gitlabProvider = await findGitlabById(input.gitlabId || "");
				if (
					IS_CLOUD &&
					gitlabProvider.gitProvider.userId !== ctx.user.ownerId
				) {
					//TODO: Remove this line when the cloud version is ready
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to access this Gitlab provider",
					});
				}
				const result = await testGitlabConnection(input);

				return `Found ${result} repositories`;
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error?.message : `Error: ${error}`,
				});
			}
		}),
	update: protectedProcedure
		.input(apiUpdateGitlab)
		.mutation(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId);
			if (IS_CLOUD && gitlabProvider.gitProvider.userId !== ctx.user.ownerId) {
				//TODO: Remove this line when the cloud version is ready
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			if (input.name) {
				await updateGitProvider(input.gitProviderId, {
					name: input.name,
					userId: ctx.user.ownerId,
				});

				await updateGitlab(input.gitlabId, {
					...input,
				});
			} else {
				await updateGitlab(input.gitlabId, {
					...input,
				});
			}
		}),
});
