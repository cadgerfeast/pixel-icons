# Contributing To Pixel Icons

## Developing

Icons are mostly created using [LibreSprite](https://github.com/LibreSprite/LibreSprite).
I suggest to create with this great tool, with a squared canvas of `16px`.
Less colors, the better.

Icons should be created in the `png-16` folder, using a `kebab-case` name.

When the icon is finished, you can add the reference inside the `icons.json` file, using some tags that describe it.

Last thing to do is to run `npm run build` in order to generate upscaled icons, and `.svg` files.

## Issues

### When you find a new issue

- Open a [new issue](https://github.com/cadgerfeast/pixel-icons/issues/new).
Be sure to include a title and a clear description.

### When you fix an issue

- [Create an issue](#when-you-find-a-new-issue) if your fix solves an issue that has not yet been reported.
- Create a pull request referencing the issue that should be solved.
- Linting and Unit-Tests should be passing.
- If needed, documentation should be updated.
