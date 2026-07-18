import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'src/renderer/assets/logo.svg')
const buildDir = path.join(root, 'build')

fs.mkdirSync(buildDir, { recursive: true })

const pngPath = path.join(buildDir, 'icon.png')
await sharp(svgPath, { density: 384 })
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(pngPath)

const ico = await pngToIco(pngPath)
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)
console.log('Generated build/icon.png and build/icon.ico')
