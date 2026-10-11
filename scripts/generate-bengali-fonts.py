"""Generate complete, offline Bengali font weights from Google's OFL source."""
from pathlib import Path
import sys

project = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project / ".expo" / "font-tools"))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source = project / ".expo" / "NotoSansBengali-variable.ttf"
for weight in (400, 500, 600):
    font = instantiateVariableFont(TTFont(source), {"wght": weight, "wdth": 100}, inplace=True)
    assert 0x0995 in font.getBestCmap(), "Bengali glyphs must not be lost to Latin subsetting"
    font.save(project / "assets" / "fonts" / f"NotoSansBengali-{weight}.ttf")
    print(f"Generated full Bengali {weight}; {len(font.getBestCmap())} mapped glyphs")
