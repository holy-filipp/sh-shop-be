/**
 * order controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized('User not authenticated')
    }

    const { data } = ctx.request.body
    data['user'] = user.id

    const entity = await strapi.service('api::order.order').create({
      data,
    })

    return entity
  },
}))
