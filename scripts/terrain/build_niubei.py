#!/usr/bin/env python3
"""Build a local, versioned Copernicus GLO-30 pilot grid; never publish raw tiles."""

import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

import numpy as np
import rasterio
from rasterio.merge import merge

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name("niubei-tiles.json")
DATA = ROOT / "terrain-data"
BASE = "https://copernicus-dem-30m.s3.amazonaws.com"
NOTICE = (
    "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and "
    "© Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS "
    "by the European Union and ESA; all rights reserved"
)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def source_path(tile_id):
    name = f"Copernicus_DSM_COG_10_{tile_id}_DEM.tif"
    return DATA / "raw" / name


def obtain(tile, download):
    tile_id = tile["id"]
    if not tile_id.startswith(("N29_00_E", "N30_00_E")) or tile_id not in {
        "N29_00_E101_00", "N29_00_E102_00", "N30_00_E101_00", "N30_00_E102_00"
    }:
        raise ValueError("Unexpected tile ID")
    path = source_path(tile_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        if not download:
            raise FileNotFoundError(f"Missing {path}; rerun with --download")
        name = path.name.removesuffix(".tif")
        url = f"{BASE}/{name}/{path.name}"
        partial = path.with_suffix(".tif.part")
        with urlopen(url, timeout=120) as source, partial.open("wb") as target:
            for block in iter(lambda: source.read(1024 * 1024), b""):
                target.write(block)
        partial.replace(path)
    actual = sha256(path)
    if actual != tile["sha256"]:
        raise ValueError(f"Checksum mismatch for {tile_id}: {actual}")
    return path


def build():
    manifest = json.loads(MANIFEST.read_text())
    # Source COGs are PixelIsPoint: their first sample is on an integer
    # arc-second coordinate. Align output cell centres to those points.
    west, south, east, north = manifest["bounds"]
    half_cell = 1 / 7200
    output_bounds = [west - half_cell, south + half_cell,
                     east - half_cell, north + half_cell]
    paths = [obtain(tile, args.download) for tile in manifest["tiles"]]
    datasets = [rasterio.open(path) for path in paths]
    try:
        for source in datasets:
            if source.crs.to_epsg() != 4326 or source.count != 1 or source.dtypes[0] != "float32":
                raise ValueError(f"Unexpected georeferencing or format: {source.name}")
        merged, transform = merge(datasets, bounds=output_bounds, res=1 / 3600,
                                  nodata=np.nan, dtype="float32")
        for lng, lat in ((101.75, 29.75), (102.25, 29.75),
                         (101.75, 30.25), (102.25, 30.25)):
            source = next(item for item in datasets if item.bounds.left <= lng < item.bounds.right
                          and item.bounds.bottom < lat <= item.bounds.top)
            native = next(source.sample([(lng, lat)]))[0]
            col = round((lng - transform.c) / transform.a - 0.5)
            row = round((lat - transform.f) / transform.e - 0.5)
            if not np.isclose(merged[0, row, col], native, atol=0.01):
                raise ValueError(f"Output grid is misaligned at {lng}, {lat}")
    finally:
        for source in datasets:
            source.close()
    values = merged[0].astype("<f4", copy=False)
    valid = np.isfinite(values) & (values > -12000) & (values < 9000)
    values[~valid] = np.nan
    output = DATA / "niubei"
    output.mkdir(parents=True, exist_ok=True)
    value_path = output / "elevation.f32"
    mask_path = output / "valid.u8"
    values.tofile(value_path)
    valid.astype("u1").tofile(mask_path)
    config_hash = hashlib.sha256(MANIFEST.read_bytes() + b"build_niubei:v2-point-aligned").hexdigest()[:12]
    metadata = {
        "schemaVersion": 1,
        "locationId": "niubei",
        "dataVersion": f"cop-dem-glo30-public-2021-{config_hash}",
        "dataset": manifest["dataset"],
        "datasetUrl": "https://registry.opendata.aws/copernicus-dem/",
        "attribution": NOTICE,
        "rasterType": "DSM",
        "horizontalDatum": "EPSG:4326",
        "verticalDatum": "EGM2008",
        "verticalDatumEpsg": 3855,
        "bounds": output_bounds,
        "transform": [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f],
        "width": int(values.shape[1]),
        "height": int(values.shape[0]),
        "nativeResolutionArcsec": 1,
        "validCells": int(valid.sum()),
        "noDataCells": int(valid.size - valid.sum()),
        "fillMaskStatus": "unavailable-in-public-COG",
        "heightErrorMaskStatus": "unavailable-in-public-COG",
        "sourceTiles": [{"id": tile["id"], "sha256": tile["sha256"]} for tile in manifest["tiles"]],
        "elevationSha256": sha256(value_path),
        "validMaskSha256": sha256(mask_path),
    }
    (output / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: metadata[key] for key in (
        "dataVersion", "width", "height", "validCells", "noDataCells")}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true", help="Download missing, pinned AWS public tiles")
    args = parser.parse_args()
    build()
