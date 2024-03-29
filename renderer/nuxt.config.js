export default {
  ssr: false,
  head: {
    title: '桃園即時通',
    meta: [{
      charset: 'utf-8'
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1'
    },
    {
      hid: 'description',
      name: 'description',
      content: '桃園即時通-桃園市地政局'
    }
    ],
    link: [{
      rel: 'icon',
      type: 'image/x-icon',
      href: '/bureau.ico'
    }
    ],
    script: []
  },
  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
    /*
     ** You can extend webpack config here
     */
    extend (config, ctx) {
      config.target = 'electron-renderer';
    },
    babel: { compact: true }
  },
  /*
   ** Customize the progress-bar color
   */
  loading: {
    color: '#5cb85c'
  },
  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: [
    // https://animate.style/
    'animate.css/animate.css',
    // https://github.com/loadingio/loading.css
    '~/assets/css/loading.min.css',
    '~/assets/css/loading-btn.css',
    // https://github.com/loadingio/transition.css/
    // '~/assets/css/transition.min.css',
    '~/assets/scss/main.scss'
  ],
  purgeCSS: {
    whitelistPatterns: [/svg.*/, /fa.*/]
  },
  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    { src: '~/plugins/axios'},
    { src: '~/plugins/global-init'},
    { src: '~/plugins/global-vue-mixin'},
    { src: '~/plugins/test'},
  ],
  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,
  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [
  ],
  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    // https://go.nuxtjs.dev/bootstrap
    'bootstrap-vue/nuxt',
    '@nuxtjs/style-resources',
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    '@nuxtjs/proxy',
    '@nuxtjs/localforage'
  ],
  bootstrapVue: {
    // Install the `IconsPlugin` plugin (in addition to `BootstrapVue` plugin)
    icons: true,
    config: {
      // Custom config options here
    }
  },
  // Axios module configuration (https://go.nuxtjs.dev/config-axios)
  axios: {
    baseURL: `${process.env.PROTOCOL}://${process.env.API_HOST}:${process.env.API_PORT}`,
    proxy: true,
    credentials: false,
    https: process.env.PROTOCOL === 'https',
    debug: false
  },
  proxy: {
    '/api': {
      target: `${process.env.PROTOCOL}://${process.env.API_HOST}:${process.env.API_PORT}`,
      changeOrigin: true
      // pathRewrite: { '^/api': '' }
    },
    '/img': {
      target: `${process.env.PROTOCOL}://${process.env.API_HOST}:${process.env.API_PORT}`,
      changeOrigin: true,
      pathRewrite: { '^/img': '' }
    }
  },
  // should hold all env variables that are public as these will be exposed on the frontend.
  // available using $config in both server and client.
  publicRuntimeConfig: {
    isDev: process.env.NODE_ENV !== 'production',
    axios: {
      // Default: baseURL; when the proxy option is true, it will become PREFIX instead of baseURL
      browserBaseURL: process.env.BROWSER_BASE_URL
    }
  },
  // should hold all env variables that are private and that should not be exposed on the frontend.
  // only available on server using same $config
  // privateRuntimeConfig always overrides publicRuntimeConfig on server-side. $config in server mode is { ...public, ...private } but for client mode only { ...public }
  privateRuntimeConfig: {
    axios: {
      // Default: http://[HOST]:[PORT][PREFIX]
      baseURL: process.env.BASE_URL
    }
  }
}
