import AppKit
import Foundation

// Setup/demo fixture authoring only. The video pipeline reads the resulting PNG.
let destination = CommandLine.arguments.dropFirst().first ?? "fixtures/inputs/cached-builds/images/cache-flow.png"
let width: CGFloat = 960
let height: CGFloat = 540
let image = NSImage(size: NSSize(width: width, height: height))
func color(_ hex: Int) -> NSColor {
    NSColor(calibratedRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
}
func text(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat, bold: Bool = false) {
    let font = bold ? NSFont.boldSystemFont(ofSize: size) : NSFont.systemFont(ofSize: size)
    NSAttributedString(string: value, attributes: [.font: font, .foregroundColor: color(0x182c2d)]).draw(at: NSPoint(x: x, y: height - y - size * 1.25))
}
image.lockFocus()
color(0xf4efe4).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()
text("Content-addressed builds", x: 40, y: 48, size: 38, bold: true)
let stages: [(String, String, CGFloat, Int)] = [
    ("SOURCE", "text + settings", 40, 0xd8ece6),
    ("HASH", "stable request key", 270, 0xd8ece6),
    ("CACHE", "reuse or rebuild", 500, 0xf6e2d4),
    ("VIDEO", "mux and validate", 730, 0xf6e2d4)
]
for (title, subtitle, x, fill) in stages {
    let box = NSBezierPath(roundedRect: NSRect(x: x, y: height - 320, width: 190, height: 110), xRadius: 14, yRadius: 14)
    color(fill).setFill(); box.fill()
    color(0x087e78).setStroke(); box.lineWidth = 2; box.stroke()
    text(title, x: x + 38, y: 232, size: 27, bold: true)
    text(subtitle, x: x + 15, y: 283, size: 16)
}
for x: CGFloat in [233, 463, 693] {
    let path = NSBezierPath(); path.move(to: NSPoint(x: x, y: height - 265)); path.line(to: NSPoint(x: x + 29, y: height - 265))
    color(0x087e78).setStroke(); path.lineWidth = 3; path.stroke()
    let head = NSBezierPath(); head.move(to: NSPoint(x: x + 22, y: height - 258)); head.line(to: NSPoint(x: x + 31, y: height - 265)); head.line(to: NSPoint(x: x + 22, y: height - 272)); head.stroke()
}
text("Matching work is reused. Every output is still checked.", x: 64, y: 410, size: 24)
image.unlockFocus()
guard let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Could not encode fixture PNG") }
let url = URL(fileURLWithPath: destination)
try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
try png.write(to: url)
print("Created \(url.path), \(png.count) bytes")
