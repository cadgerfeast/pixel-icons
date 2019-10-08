const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const webfontsGenerator = require('webfonts-generator');

const icons15Path = path.resolve(__dirname, 'png-15');
const icons150Path = path.resolve(__dirname, 'png-150');
const icons1500Path = path.resolve(__dirname, 'png-1500');
const iconsSvgPath = path.resolve(__dirname, 'svg');
const fontsPath = path.resolve(__dirname, 'fonts');

const icons = require('./icons.json');

function rimraf (folder) {
  if (fs.existsSync(folder)) {
    fs.readdirSync(folder).forEach((entry) => {
      const currentPath = path.join(folder, entry);
      if (fs.lstatSync(currentPath).isDirectory()) {
        rimraf(currentPath);
      } else {
        fs.unlinkSync(currentPath);
      }
    });
    fs.rmdirSync(folder);
  }
}

function generateList (icons) {
  let markdownContent = '# Icon list\n\n';
  markdownContent += '<table style="background-color: #333">\n\t<tbody>\n';
  markdownContent += '\t\t<tr>\n';
  let count = 0;
  for (const icon in icons) {
    count++;
    markdownContent += `\t\t\t<td align="center" style="border: 1px solid #111"><img src="./png-150/${icon}.png" width="100px"/><br/><span>${icon}</span><br/><span>[${icons[icon].tags.join(', ')}]</span></td>\n`;
    if (count > 7) {
      markdownContent += '\t\t</tr>\n';
      markdownContent += '\t\t<tr>\n';
      count = 0;
    }
  }
  markdownContent += '\t</tbody>\n</table>\n';
  fs.writeFileSync(path.resolve(__dirname, 'ICONS.md'), markdownContent);
}

async function createIcon (icon, destSvg, dest150, dest1500) {
  const src = path.resolve(icons15Path, icon);
  const i150FilePath = path.resolve(dest150, icon);
  await sharp(src).resize(150, 150, { kernel: 'nearest' }).toFile(i150FilePath);
  const i1500FilePath = path.resolve(dest1500, icon);
  await sharp(src).resize(1500, 1500, { kernel: 'nearest' }).toFile(i1500FilePath);
  const iSvgFilePath = path.resolve(destSvg, icon.replace(/.png/g, '.svg'));
  return await generateSvg(icon.slice(0, -4), src, iSvgFilePath);
}

async function generateSvg (name, src, dest) {
  return new Promise((resolve, reject) => {
    sharp(src).raw()
      .toBuffer((err, buffer, img) => {
        if (err) { reject(err); }
        let svgContent = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${img.width * 10}" height="${img.height * 10}">\n`;
        const colors = [];
        for (let i = 0; i < img.height; i++) {
          for (let j = 0; j < img.width; j++) {
            const idx = (img.width * i + j) << 2;
            if (buffer[idx + 3] !== 0) {
              const style = `rgba(${buffer[idx]},${buffer[idx + 1]},${buffer[idx + 2]},${buffer[idx + 3]})`;
              let index = colors.indexOf(style);
              if (index === -1) {
                colors.push(style);
                index = colors.indexOf(style);
              } 
              svgContent += `\t<rect class="color-${index}" x="${j * 10}" y="${i * 10}" width="10" height="10"/>\n`;
            }
          }
        }
        svgContent += '\t<style>\n';
        svgContent += '\t:root {\n';
        for (let k = 0; k < colors.length; k++) {
          svgContent += `\t\t--pixel-icon-${name}-color-${k}: ${colors[k]};\n`;
        }
        svgContent += '\t}\n';
        for (let k = 0; k < colors.length; k++) {
          svgContent += `\t.color-${k} { fill: var(--pixel-icon-${name}-color-${k}); }\n`;
        }
        svgContent += '\t</style>\n</svg>';
        fs.writeFileSync(dest, svgContent);
        resolve(dest);
      });
  });
}

const build = async function () {
  try {
    rimraf(iconsSvgPath);
    rimraf(icons150Path);
    rimraf(icons1500Path);
    // Building icons
    fs.mkdirSync(iconsSvgPath);
    fs.mkdirSync(icons150Path);
    fs.mkdirSync(icons1500Path);
    const svgFiles = [];
    const finalIconList = {};
    const iconList = Object.keys(icons);
    const iconFiles = fs.readdirSync(icons15Path);
    for (let i = iconFiles.length; i--;) {
      const iconName = iconFiles[i].slice(0, -4);
      if (iconList.indexOf(iconName) === -1) {
        console.warn(`${iconName} seems to not be used.`);
        iconFiles.splice(i, 1);
      } else {
        finalIconList[iconName] = icons[iconName];
      }
    }
    for (let i = iconList.length; i--;) {
      const lookout = `${iconList[i]}.png`;
      if (iconFiles.indexOf(lookout) === -1) {
        console.warn(`${iconList[i]} does not exist.`);
        iconList.splice(i, 1);
      }
    }
    for (const icon in finalIconList) {
      const svgIcon = await createIcon(`${icon}.png`, iconsSvgPath, icons150Path, icons1500Path);
      svgFiles.push(svgIcon);
    }
    generateList(finalIconList);
    // Building fonts
    if (!fs.existsSync(fontsPath)) {
      fs.mkdirSync(fontsPath);
    } else {
      rimraf(fontsPath);
    }
    webfontsGenerator({
      files: svgFiles,
      dest: fontsPath,
      fontName: 'PixelIcons',
      types: ['eot', 'woff2', 'woff', 'ttf', 'svg'],
      templateOptions: {
        classPrefix: 'pi-',
        baseSelector: '.pi'
      }
    });
  } catch (error) {
    console.error(error);
  }
};

if (exports && module && module.parent) {
  exports.build = build;
} else {
  build();
}
