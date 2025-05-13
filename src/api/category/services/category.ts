/**
 * category service
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::category.category')

// export default factories.createCoreService('api::category.category', ({ strapi }) => ({
//   async find(...args) {
//     const { results, pagination } = await super.find(...args)
//
//     console.log(results)
//
//     return { results, pagination }
//   },
// }))
