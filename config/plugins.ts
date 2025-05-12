export default ({ env }) => ({
  'users-permissions': {
    config: {
      register: {
        allowedFields: ['phone', 'name'],
      },
    },
  },
})
