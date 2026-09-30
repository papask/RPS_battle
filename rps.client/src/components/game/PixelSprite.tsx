// 16x16-style pixel sprites drawn from character grids.
// Each character maps to a palette color; '.' is transparent.

export const PX = {
    ink: '#1A1C2C',
    white: '#F4F4F4',
    light: '#94B0C2',
    mid: '#566C86',
    red: '#B13E53',
    plum: '#5D275D',
    yellow: '#FFCD75',
    cyan: '#73EFF7',
    lime: '#A7F070',
    blue: '#3B5DC9',
    navy: '#29366F',
    slate: '#333C57',
};

const SPRITES = {
    rock: {
        palette: { k: PX.ink, g: PX.light, l: PX.white, d: PX.mid },
        grid: [
            '................',
            '................',
            '......kkkkk.....',
            '....kklllggkk...',
            '...klllgggggk...',
            '..kllggggggggk..',
            '..klgggggggggdk.',
            '.klggggggggggdk.',
            '.kgggkggggkgggdk',
            '.kgggggggggdggdk',
            '.kggdggkkkgggddk',
            '..kgggggggggddk.',
            '..kddggggggdddk.',
            '...kkddddddddk..',
            '.....kkkkkkkk...',
            '................',
        ],
    },
    paper: {
        palette: { k: PX.ink, w: PX.white, b: PX.light, s: PX.mid },
        grid: [
            '................',
            '...kkkkkkkkk....',
            '...kwwwwwwwkk...',
            '...kwwwwwwwkbk..',
            '...kwwwwwwwkkkk.',
            '...kwbbbbbwwwwk.',
            '...kwwwwwwwwwwk.',
            '...kwbbbbbbbbwk.',
            '...kwwwwwwwwwwk.',
            '...kwbbbbbbbbwk.',
            '...kwwwwwwwwwwk.',
            '...kwbbbbbbwwwk.',
            '...kwwwwwwwwwsk.',
            '...kssssssssssk.',
            '...kkkkkkkkkkkk.',
            '................',
        ],
    },
    scissors: {
        palette: { k: PX.ink, w: PX.white, s: PX.mid, r: PX.red },
        grid: [
            '................',
            '.kk..........kk.',
            '.kwk........kwk.',
            '..kwk......kwk..',
            '...kwk....kwk...',
            '....kwk..kwk....',
            '.....kwkkwk.....',
            '......kssk......',
            '.....krkkrk.....',
            '..kkkkk..kkkkk..',
            '.krrrrk..krrrrk.',
            '.kr..rk..kr..rk.',
            '.kr..rk..kr..rk.',
            '.krrrrk..krrrrk.',
            '..kkkk....kkkk..',
            '................',
        ],
    },
    unknown: {
        palette: { k: PX.ink, y: PX.yellow },
        grid: [
            '.kkkkk..',
            'kyyyyyk.',
            'kyk.kyyk',
            '.k..kyyk',
            '...kyyk.',
            '..kyyk..',
            '..kyyk..',
            '...kk...',
            '..kyyk..',
            '...kk...',
        ],
    },
    heart: {
        palette: { k: PX.ink, r: PX.red, w: PX.white },
        grid: [
            '..kk...kk..',
            '.krrk.krrk.',
            'krwrrkrrrrk',
            'krrrrrrrrrk',
            '.krrrrrrrk.',
            '..krrrrrk..',
            '...krrrk...',
            '....krk....',
            '.....k.....',
        ],
    },
} satisfies Record<string, { palette: Record<string, string>; grid: string[] }>;

export type SpriteName = keyof typeof SPRITES;

// One <path> per color, built once at module load.
const LAYERS = Object.fromEntries(
    Object.entries(SPRITES).map(([name, { palette, grid }]) => [
        name,
        {
            w: Math.max(...grid.map(r => r.length)),
            h: grid.length,
            paths: Object.entries(palette).map(([ch, fill]) => {
                let d = '';
                grid.forEach((row, y) => {
                    for (let x = 0; x < row.length; x++) if (row[x] === ch) d += `M${x} ${y}h1v1h-1z`;
                });
                return { fill, d };
            }),
        },
    ])
) as Record<SpriteName, { w: number; h: number; paths: { fill: string; d: string }[] }>;

export default function PixelSprite({ name, size, className = '' }: { name: SpriteName; size: number; className?: string }) {
    const { w, h, paths } = LAYERS[name];
    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            width={size}
            height={(size * h) / w}
            shapeRendering="crispEdges"
            aria-hidden="true"
            className={className}
        >
            {paths.map(p => <path key={p.fill} d={p.d} fill={p.fill} />)}
        </svg>
    );
}
