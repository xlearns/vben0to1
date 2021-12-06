import { UserConfig,defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { createVitePlugins } from './build/vite/plugin';

import { generateModifyVars } from './build/generate/generateModifyVars';

import { loadEnv } from 'vite';  //.env.development.local、.env.development、.env.local、.env 输出NODE_ENV和VITE_开头的键值对

import { resolve } from 'path'; // 主要用于alias文件路径别名

import pkg from './package.json'; //获取packjage里面的信息

import moment from 'moment';     //格式化日期 可以解决24不是0点的问题【moment("2020-1-1 24:00:00").format('YYYY-MM-DD HH:mm:ss')】

import { createProxy } from './build/vite/proxy';

import { OUTPUT_DIR } from './build/constant';

import { wrapperEnv } from './build/utils';
//process.cwd() == __dirname

const { dependencies, devDependencies, name, version } = pkg;

const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: moment().format('YYYY-MM-DD HH:mm:ss'),
};


function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir);
}


// https://vitejs.dev/config/
export default ({ command, mode })=>{
  // command运行模式：dev or build or serve
  const root = process.cwd()
  //mode为环境模式
  const env = loadEnv(mode, root); //拿到所有env里面声明的VITE_的数据
  
  const viteEnv = wrapperEnv(env); //格式化重env取到的数据
  
  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_DROP_CONSOLE } = viteEnv;
  
  //是不是build模式
  const isBuild = command === 'build';

  const isDev = command === 'dev';

  const isServe = command === 'serve';
  
  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve:{
      alias: [
      //国际化
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
        },
        // /@/xxxx => src/xxxx
        {
          find: /\/@\//,
          replacement: pathResolve('src') + '/',
        },
        // /#/xxxx => types/xxxx
        {
          find: /\/#\//,
          replacement: pathResolve('types') + '/',
        },
        // ['@vue/compiler-sfc', '@vue/compiler-sfc/dist/compiler-sfc.esm-browser.js'],
      ],
    },
    server:{
      //全部local IP
      host: true,
      port: VITE_PORT,
      proxy: createProxy(VITE_PROXY),
    },
    build: {
      target: 'es2015',
      outDir: OUTPUT_DIR,
      terserOptions: {
        compress: {
          keep_infinity: true, //可以防止Infinity被压缩为1/0，这可能会导致Chrome出现性能问题
          drop_console: VITE_DROP_CONSOLE, // 用于删除生产环境中的console
        },
      }, 
      brotliSize: false,            //启用/禁用 brotli 压缩大小报告
      chunkSizeWarningLimit: 2000,  //chunk 大小警告的限制
    },
    define: {
      // 定义全局变量替换方式。每项在开发时会被定义为全局变量，而在构建时则是静态替换。
      // setting vue-i18-next
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },
    css: {
      preprocessorOptions: {
        less: {
          modifyVars: generateModifyVars(),
          javascriptEnabled: true,
        },
      },
    },
    plugins: createVitePlugins(viteEnv, isBuild),
  }
}
