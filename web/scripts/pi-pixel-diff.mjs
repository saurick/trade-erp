import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const pixelmatch = require('pixelmatch').default
const { PNG } = require('pngjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(webRoot, '..')

const printUsageAndExit = (message) => {
  if (message) {
    console.error(message)
  }
  console.error(`
用法：
  pnpm pi:pixel-diff -- --ref /绝对路径/外销形式发票模版.pdf [--out /绝对路径/输出目录] [--browser chrome|webkit|firefox|msedge]

可选参数：
  --record /path/to/record.json   使用指定记录数据渲染 PI（默认用模板内置默认值）
  --mask x,y,w,h                 忽略指定矩形区域（可重复传入）
`)
  process.exit(1)
}

const run = (cmd, args, options = {}) => {
  const spawnOptions = { encoding: 'utf8', ...options }
  if (!Object.prototype.hasOwnProperty.call(spawnOptions, 'stdio')) {
    spawnOptions.stdio = 'inherit'
  }
  const result = spawnSync(cmd, args, {
    ...spawnOptions,
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    const stdout = String(result.stdout || '').trim()
    const stderr = String(result.stderr || '').trim()
    const output = [
      stdout && `stdout:\n${stdout}`,
      stderr && `stderr:\n${stderr}`,
    ]
      .filter(Boolean)
      .join('\n')
    throw new Error(
      `${cmd} 退出码异常：${result.status}${output ? `\n${output}` : ''}`
    )
  }
}

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true })
}

const parseRect = (raw) => {
  const parts = String(raw || '')
    .split(',')
    .map((value) => Number(value.trim()))
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    throw new Error(`mask 参数格式错误：${raw}`)
  }
  const [x, y, width, height] = parts
  if (width <= 0 || height <= 0) {
    throw new Error(`mask 参数宽高必须为正数：${raw}`)
  }
  return { x, y, width, height }
}

const parseArgs = (argv) => {
  const args = {
    refPdf: '',
    outDir: path.resolve(repoRoot, 'output/pi-pixel-diff'),
    recordPath: '',
    masks: [],
    browser: 'chrome',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const next = argv[index + 1]
    if (key === '--ref') {
      args.refPdf = String(next || '')
      index += 1
      continue
    }
    if (key === '--out') {
      args.outDir = path.resolve(String(next || ''))
      index += 1
      continue
    }
    if (key === '--record') {
      args.recordPath = String(next || '')
      index += 1
      continue
    }
    if (key === '--mask') {
      args.masks.push(parseRect(next))
      index += 1
      continue
    }
    if (key === '--browser') {
      args.browser = String(next || '').trim() || args.browser
      index += 1
      continue
    }
    if (key === '--help' || key === '-h') {
      printUsageAndExit()
    }
  }

  return args
}

const readJsonIfExists = (filePath) => {
  if (!filePath) {
    return {}
  }
  const absPath = path.resolve(filePath)
  if (!fs.existsSync(absPath)) {
    throw new Error(`record 文件不存在：${absPath}`)
  }
  const raw = fs.readFileSync(absPath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new Error(`record JSON 解析失败：${absPath}`)
  }
}

const toDataURL = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ''
  if (!mime) {
    throw new Error(`暂不支持的图片格式：${filePath}`)
  }
  const buffer = fs.readFileSync(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

const renderPdfToPng = (pdfPath, outDir) => {
  if (process.platform !== 'darwin') {
    throw new Error('当前脚本仅在 macOS 下支持 PDF 渲染（依赖 qlmanage）')
  }
  const absPdfPath = path.resolve(pdfPath)
  if (!fs.existsSync(absPdfPath)) {
    throw new Error(`参考 PDF 不存在：${absPdfPath}`)
  }
  ensureDir(outDir)
  run('/usr/bin/qlmanage', ['-t', '-s', '2000', '-o', outDir, absPdfPath], {
    stdio: 'ignore',
  })

  const expected = path.join(outDir, `${path.basename(absPdfPath)}.png`)
  if (fs.existsSync(expected)) {
    return expected
  }

  const candidates = fs
    .readdirSync(outDir)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map((name) => path.join(outDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  if (candidates.length === 0) {
    throw new Error('qlmanage 未生成任何 PNG')
  }
  return candidates[0]
}

const resizePngWithSips = ({ inputPath, outputPath, width, height }) => {
  const targetWidth = Math.max(1, Math.round(Number(width) || 0))
  const targetHeight = Math.max(1, Math.round(Number(height) || 0))
  run(
    '/usr/bin/sips',
    [
      '-z',
      String(targetHeight),
      String(targetWidth),
      path.resolve(inputPath),
      '--out',
      path.resolve(outputPath),
    ],
    { stdio: 'ignore' }
  )
  if (!fs.existsSync(outputPath)) {
    throw new Error(`PNG 缩放失败：${outputPath}`)
  }
}

const screenshotHTML = async ({
  htmlPath,
  outPngPath,
  viewportWidth,
  viewportHeight,
  outDir,
  browser,
}) => {
  const session = `pi${Date.now().toString(36)}`
  const cacheDir = path.join(outDir, 'npm-cache')
  ensureDir(cacheDir)
  const env = { ...process.env, NPM_CONFIG_CACHE: cacheDir, TMPDIR: '/tmp' }
  const html = fs.readFileSync(path.resolve(htmlPath), 'utf8')
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  const width = Math.max(1, Math.round(Number(viewportWidth) || 0))
  const height = Math.max(1, Math.round(Number(viewportHeight) || 0))
  const base = [
    '--yes',
    '--package',
    '@playwright/cli',
    'playwright-cli',
    '--session',
    session,
  ]

  const runnerOptions = { cwd: outDir, env, stdio: 'pipe' }
  run('npx', [...base, 'open', dataUrl, '--browser', browser], runnerOptions)
  run('npx', [...base, 'resize', String(width), String(height)], runnerOptions)
  run(
    'npx',
    [...base, 'run-code', 'await page.waitForTimeout(120)'],
    runnerOptions
  )
  run(
    'npx',
    [...base, 'screenshot', '--filename', path.resolve(outPngPath)],
    runnerOptions
  )
  run('npx', [...base, 'close'], runnerOptions)
}

const readPng = (pngPath) => PNG.sync.read(fs.readFileSync(pngPath))

const applyMasks = (refPng, curPng, masks = []) => {
  if (!masks.length) {
    return { refData: refPng.data, curData: curPng.data }
  }
  const width = Math.min(refPng.width, curPng.width)
  const height = Math.min(refPng.height, curPng.height)
  const refData = Buffer.from(refPng.data)
  const curData = Buffer.from(curPng.data)
  masks.forEach(({ x, y, width: w, height: h }) => {
    const startX = Math.max(0, Math.floor(x))
    const startY = Math.max(0, Math.floor(y))
    const endX = Math.min(width, startX + Math.floor(w))
    const endY = Math.min(height, startY + Math.floor(h))
    for (let yy = startY; yy < endY; yy += 1) {
      for (let xx = startX; xx < endX; xx += 1) {
        const idx = (yy * width + xx) * 4
        curData[idx] = refData[idx]
        curData[idx + 1] = refData[idx + 1]
        curData[idx + 2] = refData[idx + 2]
        curData[idx + 3] = refData[idx + 3]
      }
    }
  })
  return { refData, curData }
}

const writeDiff = ({ refPng, curPng, outPath, includeAA }) => {
  const width = Math.min(refPng.width, curPng.width)
  const height = Math.min(refPng.height, curPng.height)
  const diff = new PNG({ width, height })
  const diffPixels = pixelmatch(
    refPng.data,
    curPng.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1,
      includeAA,
    }
  )
  fs.writeFileSync(outPath, PNG.sync.write(diff))
  return diffPixels
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (!args.refPdf) {
    printUsageAndExit('缺少参数：--ref /path/to/template.pdf')
  }
  ensureDir(args.outDir)

  const record = readJsonIfExists(args.recordPath)

  const {
    PROFORMA_PAGE_WIDTH,
    PROFORMA_PAGE_HEIGHT,
    buildProformaInvoiceStandaloneHTML,
  } = await import(
    pathToFileURL(
      path.resolve(webRoot, 'src/erp/data/proformaInvoiceTemplate.mjs')
    ).href
  )

  const renderedPdfPng = renderPdfToPng(args.refPdf, args.outDir)
  const refPath = path.join(args.outDir, 'ref.png')
  fs.copyFileSync(renderedPdfPng, refPath)

  const logoPath = path.resolve(
    webRoot,
    'public/templates/billing-info-logo.png'
  )
  const logoSrc = fs.existsSync(logoPath) ? toDataURL(logoPath) : undefined
  const signaturePath = path.resolve(
    webRoot,
    'public/templates/proforma-signature.png'
  )
  // 缺少签章图时保持默认模板路径，保证像素对比脚本可继续执行。
  const signatureSrc = fs.existsSync(signaturePath)
    ? toDataURL(signaturePath)
    : undefined
  const html = buildProformaInvoiceStandaloneHTML(record, {
    logoSrc,
    signatureSrc,
  })
  const htmlPath = path.join(args.outDir, 'current.html')
  fs.writeFileSync(htmlPath, html, 'utf8')

  const curPath = path.join(args.outDir, 'current.png')
  await screenshotHTML({
    htmlPath,
    outPngPath: curPath,
    viewportWidth: PROFORMA_PAGE_WIDTH,
    viewportHeight: PROFORMA_PAGE_HEIGHT,
    outDir: args.outDir,
    browser: args.browser,
  })

  const curPng = readPng(curPath)
  let refPng = readPng(refPath)
  if (refPng.width !== curPng.width || refPng.height !== curPng.height) {
    const normalizedRefPath = path.join(args.outDir, 'ref-normalized.png')
    // 参考 PDF 渲染尺寸受 qlmanage 影响，统一缩放到当前截图尺寸后再做像素对比。
    resizePngWithSips({
      inputPath: refPath,
      outputPath: normalizedRefPath,
      width: curPng.width,
      height: curPng.height,
    })
    refPng = readPng(normalizedRefPath)
  }

  const { refData, curData } = applyMasks(refPng, curPng, args.masks)
  refPng.data = refData
  curPng.data = curData

  const diffPath = path.join(args.outDir, 'diff.png')
  const diffAaPath = path.join(args.outDir, 'diff-include-aa.png')
  const diffIgnoreAa = writeDiff({
    refPng,
    curPng,
    outPath: diffPath,
    includeAA: false,
  })
  const diffIncludeAa = writeDiff({
    refPng,
    curPng,
    outPath: diffAaPath,
    includeAA: true,
  })

  console.log('ref:', refPath)
  console.log('current:', curPath)
  console.log('diff(ignoreAA):', diffIgnoreAa, diffPath)
  console.log('diff(includeAA):', diffIncludeAa, diffAaPath)
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exit(1)
})
