import { Context } from '../context';

export const launchpadResolvers = {
  Query: {
    launchpadProjects: async (_: any, __: any, { launchpadService }: Context) => {
      return launchpadService.getLaunchpadProjects();
    },
    launchpadProject: async (_: any, { id }: { id: string }, { launchpadService }: Context) => {
      return launchpadService.getLaunchpadProject(id);
    },
    launchpadOverview: async (_: any, __: any, { launchpadService }: Context) => {
      return launchpadService.getLaunchpadOverview();
    }
  }
};
