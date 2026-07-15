const BINARY_EXT = new Set([
  'png','jpg','jpeg','gif','bmp','ico','webp','tiff','svgz','psd','ai',
  'mp3','wav','ogg','flac','aac','mp4','mkv','avi','mov','webm',
  'exe','dll','so','dylib','bin','obj','class','jar','wasm',
  'zip','rar','7z','tar','gz','bz2','xz','iso','dmg','apk',
  'pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp',
  'sqlite','db','mdb','ttf','otf','woff','woff2','eot','pcap','pyc'
])

export const isBinaryPath = (filename: string): boolean => {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  return BINARY_EXT.has(ext)
}
