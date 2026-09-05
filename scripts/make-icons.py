"""Generates the PWA icon set. No image deps — writes PNGs directly via zlib."""
import struct, zlib, math, pathlib

INK    = (0x0d, 0x11, 0x17)
LINE   = (0x26, 0x31, 0x40)
ACCENT = (0x4c, 0x9a, 0xff)


def png(path, w, h, pixels):
    raw = b"".join(b"\x00" + bytes(v for px in row for v in px) for row in pixels)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    out = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    pathlib.Path(path).write_bytes(out)


def coverage(px, py, x, y, size, r):
    """Anti-aliased rounded-square coverage at a pixel, via 3x3 supersampling."""
    hits = 0
    for sy in range(3):
        for sx in range(3):
            ax, ay = px + (sx + 0.5) / 3, py + (sy + 0.5) / 3
            dx = max(x - ax, ax - (x + size), 0)
            dy = max(y - ay, ay - (y + size), 0)
            if dx == 0 and dy == 0:
                cx = min(max(ax, x + r), x + size - r)
                cy = min(max(ay, y + r), y + size - r)
                if math.hypot(ax - cx, ay - cy) <= r:
                    hits += 1
    return hits / 9


def build(n):
    """Four tiles — the four options — with one picked out in accent."""
    s = n / 512
    cell, gap = 112 * s, 32 * s
    origin = 128 * s
    radius = 24 * s
    tiles = [(origin, origin, ACCENT),
             (origin + cell + gap, origin, LINE),
             (origin, origin + cell + gap, LINE),
             (origin + cell + gap, origin + cell + gap, LINE)]
    rows = []
    for py in range(n):
        row = []
        for px in range(n):
            r, g, b = INK
            for tx, ty, colour in tiles:
                a = coverage(px, py, tx, ty, cell, radius)
                if a:
                    r = round(r + (colour[0] - r) * a)
                    g = round(g + (colour[1] - g) * a)
                    b = round(b + (colour[2] - b) * a)
            row.append((r, g, b))
        rows.append(row)
    return rows


for name, size in [("public/icon-192.png", 192),
                   ("public/icon-512.png", 512),
                   ("public/apple-touch-icon.png", 180)]:
    png(name, size, size, build(size))
    print(f"  {name} ({size}x{size})")
