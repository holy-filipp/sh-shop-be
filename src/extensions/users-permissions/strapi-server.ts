import type { Plugin } from '@strapi/types'
import type { Context, Next } from 'koa'
import { errors } from '@strapi/utils'
import { concat, compact, isArray } from 'lodash/fp'
import { validateRegisterBody } from './validation/auth'
import _ from 'lodash'

const { ApplicationError, ValidationError, ForbiddenError } = errors
const getService = (name) => {
  return strapi.plugin('users-permissions').service(name)
}
const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state
  const userSchema = strapi.getModel('plugin::users-permissions.user')

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth })
}
const phoneRegex = new RegExp('\\+[0-9]\\s[0-9]{3}\\s[0-9]{3}\\s[0-9]{2}\\s[0-9]{2}')

export default (plugin: Plugin.LoadedPlugin) => {
  // for some reason users-permissions plugin doesn't share auth field
  // @ts-ignore
  const defaultAuthController = plugin.controllers.auth({ strapi })

  plugin.controllers.auth = {
    ...defaultAuthController,
    register: async (ctx: Context, next: Next) => {
      const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' })

      const settings = await pluginStore.get({ key: 'advanced' })

      // @ts-ignore
      if (!settings.allow_register) {
        throw new ApplicationError('Register action is currently disabled')
      }

      const { phone } = ctx.request.body

      if (!phone) {
        throw new ValidationError('phone is a required field')
      }

      if (!phoneRegex.test(phone)) {
        throw new ValidationError('phone format is invalid')
      }

      // @ts-ignore
      const { register } = strapi.config.get('plugin::users-permissions')
      const alwaysAllowedKeys = ['username', 'password', 'email']

      // Note that we intentionally do not filter allowedFields to allow a project to explicitly accept private or other Strapi field on registration
      const allowedKeys = compact(
        concat(alwaysAllowedKeys, isArray(register?.allowedFields) ? register.allowedFields : [])
      )

      // Check if there are any keys in requestBody that are not in allowedKeys
      const invalidKeys = Object.keys(ctx.request.body).filter((key) => !allowedKeys.includes(key))

      if (invalidKeys.length > 0) {
        // If there are invalid keys, throw an error
        throw new ValidationError(`Invalid parameters: ${invalidKeys.join(', ')}`)
      }

      const params = {
        ..._.pick(ctx.request.body, allowedKeys),
        provider: 'local',
      }

      const validations = strapi.config.get('plugin::users-permissions.validationRules')

      await validateRegisterBody(params, validations)

      const role = await strapi.db
        .query('plugin::users-permissions.role')
        // @ts-ignore
        .findOne({ where: { type: settings.default_role } })

      if (!role) {
        throw new ApplicationError('Impossible to find the default role')
      }

      // @ts-ignore
      const { email, username, provider } = params

      const identifierFilter = {
        $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }, { username }, { email: username }],
      }

      const conflictingUserCount = await strapi.db.query('plugin::users-permissions.user').count({
        where: { ...identifierFilter, provider },
      })

      if (conflictingUserCount > 0) {
        throw new ApplicationError('Email or Username are already taken')
      }

      // @ts-ignore
      if (settings.unique_email) {
        const conflictingUserCount = await strapi.db.query('plugin::users-permissions.user').count({
          where: { ...identifierFilter },
        })

        if (conflictingUserCount > 0) {
          throw new ApplicationError('Email or Username are already taken')
        }
      }

      const newUser = {
        ...params,
        role: role.id,
        email: email.toLowerCase(),
        username,
        // @ts-ignore
        confirmed: !settings.email_confirmation,
      }

      const user = await getService('user').add(newUser)

      const sanitizedUser = await sanitizeUser(user, ctx)

      // @ts-ignore
      if (settings.email_confirmation) {
        try {
          await getService('user').sendConfirmationEmail(sanitizedUser)
        } catch (err) {
          strapi.log.error(err)
          throw new ApplicationError('Error sending confirmation email')
        }

        return ctx.send({ user: sanitizedUser })
      }

      const jwt = getService('jwt').issue(_.pick(user, ['id']))

      return ctx.send({
        jwt,
        user: sanitizedUser,
      })
    },
  }

  return plugin
}
