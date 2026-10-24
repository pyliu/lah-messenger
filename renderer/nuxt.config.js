import path from 'path'
import fs from 'fs'

// 取得真實路徑以解決在不同路徑、Symlink 或 Junction 下相對路徑解析錯誤的問題
const rendererDir = fs.realpathSync(__dirname)
const rootDir = fs.realpathSync(path.resolve(__dirname, '..'))

export default {
  rootDir,
  srcDir: rendererDir,
  buildDir: path.resolve(rendererDir, '.nuxt'),
  modulesDir: [
    path.resolve(rootDir, 'node_modules')
  ],
  target: 'static',
  generate: {
    dir: path.resolve(rendererDir, 'dist'),
    fallback: 'index.html'
  },
  ssr: false,
  head: {
    title: process.env.APP || '桃園即時通',
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
      content: `${process.env.APP} - 桃園市政府地政局`
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
      // 確保在任何路徑或 Symlink 下 Webpack 都能從根目錄正確解析依賴
      config.resolve.modules = [
        path.resolve(rootDir, 'node_modules'),
        'node_modules'
      ];
      config.resolve.symlinks = true;
      // 注入 Electron Shim 讓元件透明對接 Tauri IPC (在 Webpack 預設 web 目標下正常打包)
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['electron'] = path.resolve(rendererDir, 'plugins/electron-shim.js');
      config.node = {
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty'
      };
    },
    babel: { compact: true },
    watchOptions: {
      ignored: ['**/src-tauri/**', '**/target/**', '**/node_modules/**']
    }
  },
  watchers: {
    webpack: {
      ignored: ['**/src-tauri/**', '**/target/**', '**/node_modules/**']
    },
    chokidar: {
      ignored: ['**/src-tauri/**', '**/target/**', '**/node_modules/**']
    }
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
    { src: '~/plugins/electron-shim.js' },
    { src: '~/plugins/app-inject.js' },
    { src: '~/plugins/global-vue-mixin.js'},
    // { src: '~/plugins/axios.js'},
    { src: '~/plugins/test.js'},
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
  env: {
    API_HOST: process.env.API_HOST || '127.0.0.1',
    API_PORT: process.env.API_PORT || '80',
    WS_HOST: process.env.WS_HOST || '',
    WS_PORT: process.env.WS_PORT || '8081',
    WS_HTTP_PORT: process.env.WS_HTTP_PORT || '8082',
    isDev: process.env.NODE_ENV !== 'production'
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
    },
    appName: process.env.APP || '桃園即時通'
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
