// Helpers
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const svgtofont = require('svgtofont');
// Constants
const icons = require('./icons.json');
const iconSizes = [32, 64, 128, 256, 512, 1024];
const iconPngPath = path.resolve(__dirname, 'png-16');
const iconSvgPath = path.resolve(__dirname, 'svg');
const fontsPath = path.resolve(__dirname, 'fonts');
const distPath = path.resolve(__dirname, 'dist');

let declaration = `declare interface PixelSvgData {
  svg: string;
  colors: string[];
}

declare interface PixelIcon {
  tags: string[];
  data: PixelSvgData
}

declare module '@pixel/icons' {
  const value: { [icon in PixelIconList]: PixelIcon; };
  export default value;
}`;

function rimraf(folder) {
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
module.exports.rimraf = rimraf;

function generateList(list) {
  let markdownContent = '# Icon list\n\n';
  markdownContent += '<table>\n\t<tbody>\n';
  markdownContent += '\t\t<tr>\n';
  let count = 0;
  for (const icon in list) {
    count++;
    markdownContent += `\t\t\t<td align="center"><img src="./png-128/${icon}.png" width="100px"/><br/><span>${icon}</span><br/><span>[${icons[icon].tags.join(', ')}]</span></td>\n`;
    if (count > 7) {
      markdownContent += '\t\t</tr>\n';
      markdownContent += '\t\t<tr>\n';
      count = 0;
    }
  }
  markdownContent += '\t</tbody>\n</table>\n';
  fs.writeFileSync(path.resolve(__dirname, 'ICONS.md'), markdownContent);
}

async function createIcon(icon) {
  const src = path.resolve(iconPngPath, icon);
  for (const size of iconSizes) {
    const destPath = path.resolve(__dirname, `png-${size}/${icon}`);
    await sharp(src).resize(size, size, { kernel: 'nearest' }).toFile(destPath);
  }
  const iSvgFilePath = path.resolve(__dirname, `svg/${icon.replace(/.png/g, '.svg')}`);
  return await generateSvg(src, iSvgFilePath);
}

async function generateSvg(src, dest) {
  const factor = Math.pow(2, 4);
  return new Promise((resolve, reject) => {
    sharp(src).raw()
      .toBuffer((err, buffer, img) => {
        if (err) { reject(err); }
        const svgData = {
          colors: []
        };
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${img.height * factor} ${img.height * factor}" width="${img.width * factor}" height="${img.height * factor}">\n`;
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
              svgContent += `\t<rect fill="${style}" x="${j * factor}" y="${i * factor}" width="${factor}" height="${factor}"/>\n`;
            }
          }
        }
        for (let k = 0; k < colors.length; k++) {
          svgData.colors.push(colors[k]);
        }
        svgContent += '</svg>';
        svgData.svg = svgContent;
        fs.writeFileSync(dest, svgContent);
        resolve({ svgIcon: dest, svgData: svgData });
      });
  });
}

async function main() {
  try {
    for (const size of iconSizes) {
      fs.emptyDirSync(path.resolve(__dirname, `png-${size}`));
    }
    fs.emptyDirSync(iconSvgPath);
    // Building icons
    const svgFiles = [];
    const finalIconList = {};
    const iconList = Object.keys(icons);
    const iconFiles = fs.readdirSync(iconPngPath);
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
    declaration += '\n\ndeclare enum PixelIconList {';
    for (const icon in finalIconList) {
      const { svgIcon, svgData } = await createIcon(`${icon}.png`);
      finalIconList[icon].data = svgData;
      svgFiles.push(svgIcon);
      declaration += `\n\t'${icon}' = '${icon}',`;
    }
    declaration = declaration.slice(0, -1);
    declaration += '\n}';
    // Building icon list
    if (fs.existsSync(distPath)) {
      rimraf(distPath);
    }
    fs.mkdirSync(distPath);
    fs.writeFileSync(path.resolve(distPath, 'icons.d.ts'), declaration);
    fs.writeFileSync(path.resolve(distPath, 'icons.json'), JSON.stringify(finalIconList, null, 2));
    // Building docs
    generateList(finalIconList);
    // Building fonts
    if (!fs.existsSync(fontsPath)) {
      fs.mkdirSync(fontsPath);
    } else {
      rimraf(fontsPath);
    }
    svgtofont({
      src: iconSvgPath,
      dist: fontsPath,
      fontName: 'PixelIcons',
      classNamePrefix: 'pi',
      css: {
        fontSize: '16px'
      },
      svgicons2svgfont: {
        fontHeight: 1000,
        normalize: true
      },
      website: {
        title: 'Pixel Icons',
        logo: path.resolve(__dirname, 'svg/github.svg')
      }
    });
  } catch (error) {
    console.error(error);
  }
}
module.exports.main = main;

if (require.main === module) {
  main();
}
