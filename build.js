const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const svgtofont = require('svgtofont');

const icons15Path = path.resolve(__dirname, 'png-15');
const icons150Path = path.resolve(__dirname, 'png-150');
const icons1500Path = path.resolve(__dirname, 'png-1500');
const iconsSvgPath = path.resolve(__dirname, 'svg');
const fontsPath = path.resolve(__dirname, 'fonts');
const distPath = path.resolve(__dirname, 'dist');

const icons = require('./icons.json');

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
module.exports.rimraf = rimraf;

function generateList (list) {
  let markdownContent = '# Icon list\n\n';
  markdownContent += '<table>\n\t<tbody>\n';
  markdownContent += '\t\t<tr>\n';
  let count = 0;
  for (const icon in list) {
    count++;
    markdownContent += `\t\t\t<td align="center"><img src="./png-150/${icon}.png" width="100px"/><br/><span>${icon}</span><br/><span>[${icons[icon].tags.join(', ')}]</span></td>\n`;
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
        const svgData = {
          colors: []
        };
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
              svgContent += `\t<rect fill="${style}" x="${j * 10}" y="${i * 10}" width="10" height="10"/>\n`;
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

async function main () {
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
    declaration += '\n\ndeclare enum PixelIconList {';
    for (const icon in finalIconList) {
      const { svgIcon, svgData } = await createIcon(`${icon}.png`, iconsSvgPath, icons150Path, icons1500Path);
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
      src: iconsSvgPath,
      dist: fontsPath,
      fontName: 'PixelIcons',
      classNamePrefix: 'pi',
      css: true
    });
  } catch (error) {
    console.error(error);
  }
}
module.exports.main = main;

if (require.main === module) {
  main();
}
