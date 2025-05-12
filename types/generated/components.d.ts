import type { Schema, Struct } from '@strapi/strapi'

export interface CommonFullName extends Struct.ComponentSchema {
  collectionName: 'components_common_full_names'
  info: {
    displayName: 'fullName'
    icon: 'user'
  }
  attributes: {
    firstName: Schema.Attribute.String
    lastName: Schema.Attribute.String
    secondName: Schema.Attribute.String
  }
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'common.full-name': CommonFullName
    }
  }
}
