import { factories } from '@strapi/strapi'

export default factories.createCoreController('plugin::users-permissions.auth' as any, ({ strapi }) => ({
  async register(ctx) {
    console.log(JSON.stringify(ctx, null, 4))

    ctx.body = 'Not implemented'
  },
}))
