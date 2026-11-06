# Rebuilding the Irregular Tile Array

The irregular array is generated from the 68 tile PNGs:

- The original set is in `www/JJ-math-tile-*.png`.
- The Optima, Rockwell, and Palatino sets are in `www/JJ-math-font-sets/`.

## Regenerate

From the workspace root, run:

```sh
node scripts/generate-irregular-tile-array.js
```

The script requires Node.js and `rsvg-convert`. Each run makes a new random arrangement and writes:

- `www/JJ-irregular-tile-array-22x10.svg`
- `www/JJ-irregular-tile-array-22x10.png`

The PNG is rendered at 300 dpi and measures 6072 × 3450 pixels, or 20.24 × 11.5 inches.

## How the Layout Works

The foreground is a 22-column by 10-row array. It contains each source tile at least twice, plus random additional picks to fill all 220 slots. Tiles are shuffled into the grid, shifted by up to 5% of the tile width or height, and uniformly scaled between 97% and 103%.

A second, full-size random tile is placed underneath every cell. These backing tiles show through wherever a shifted or reduced foreground tile leaves a gap.

## Modify the Array

Edit `scripts/generate-irregular-tile-array.js`:

- Change `columns` or `rows` to change the grid dimensions.
- Change `tileWidth` or `tileHeight` to change the source-tile layout size.
- Change `outputHeightInches` to change the printed height. The width is calculated from the grid's aspect ratio.
- Change the offset or scale ranges in the foreground loop to adjust the irregularity.
- Change the output filenames if you want to keep the current array unchanged.

The current source-count check expects 68 PNGs. If you add or remove source tiles, update that check. Keep at least twice as many foreground slots as source tiles to preserve the guarantee that each source appears twice.
