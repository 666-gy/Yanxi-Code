// 二进制文件扩展名集合 —— 按子类分组以便前端 FileIcon 选取对应图标
const BINARY_EXT = new Set([
  // 图片
  'png','jpg','jpeg','gif','bmp','ico','webp','tiff','svgz','psd','ai','heic','avif','raw','cr2','nef','tga',
  // 音频
  'mp3','wav','ogg','flac','aac','m4a','opus','wma','aiff','mid','midi',
  // 视频
  'mp4','mkv','avi','mov','webm','flv','wmv','m4v','mpg','mpeg','3gp',
  // 可执行 / 库
  'exe','dll','so','dylib','bin','obj','class','jar','wasm','pyc','pyo','o','a','lib',
  // 压缩包
  'zip','rar','7z','tar','gz','bz2','xz','iso','dmg','apk','tgz','tbz','cab','msi','deb','rpm','xz','lz','zst',
  // 文档（二进制格式）
  'pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp','epub','mobi','azw','azw3',
  // 数据库
  'sqlite','db','mdb','db3','sqlitedb','accdb',
  // 字体
  'ttf','otf','woff','woff2','eot',
  // Windows 快捷方式 / 特殊文件
  'lnk','url','searchconnector-ms',
  // 网络抓包
  'pcap','pcapng','cap',
  // 模型 / 媒体缓存
  'model','glb','gltf','pak',
  // 编译输出 / 中间文件
  'min','map','nest','coverage','lcov',
])

export const isBinaryPath = (filename: string): boolean => {
  const dot = filename.lastIndexOf('.')
  if (dot < 0) return false
  const ext = filename.slice(dot + 1).toLowerCase()
  return BINARY_EXT.has(ext)
}
