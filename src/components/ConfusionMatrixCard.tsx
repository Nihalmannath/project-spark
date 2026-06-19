import { LABELS, type LabelKey } from "../data/labels";

interface Props {
  matrix: number[][]; // rows: true, cols: predicted
  classes?: LabelKey[];
  imageSrc?: string;
}

const DEFAULT_CLASSES: LabelKey[] = ["desert", "swamp", "mirage", "oasis"];

export function ConfusionMatrixCard({ matrix, classes = DEFAULT_CLASSES, imageSrc }: Props) {
  // TODO(integration): if a real confusion-matrix PNG exists in the repo
  // (e.g. /public/cm/{checkpoint}.png), pass it via `imageSrc` and we'll
  // render the image instead of the data grid.
  if (imageSrc) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <img src={imageSrc} alt="Confusion matrix" className="w-full" />
      </div>
    );
  }
  const maxVal = Math.max(...matrix.flat());
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="smallcaps text-[10px] text-muted-foreground">Confusion matrix</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2"></th>
              <th colSpan={classes.length} className="smallcaps pb-2 text-center text-[10px] font-normal text-muted-foreground">
                Predicted →
              </th>
            </tr>
            <tr>
              <th></th>
              {classes.map((c) => (
                <th key={c} className="px-2 py-1 text-xs font-medium text-foreground">
                  {LABELS[c].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <th className="whitespace-nowrap px-2 py-1 text-right text-xs font-medium text-foreground">
                  {LABELS[classes[i]].name}
                </th>
                {row.map((v, j) => {
                  const intensity = v / maxVal;
                  const isDiag = i === j;
                  return (
                    <td
                      key={j}
                      className="border border-border/40 px-3 py-3 text-center"
                      style={{
                        backgroundColor: isDiag
                          ? `color-mix(in oklab, ${LABELS[classes[i]].color} ${20 + intensity * 60}%, transparent)`
                          : `color-mix(in oklab, var(--ink) ${intensity * 12}%, transparent)`,
                      }}
                    >
                      <span className="metric-num text-sm text-foreground">{v}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Rows represent true labels; columns represent predicted labels. Darker diagonal cells indicate correct classifications.
      </p>
    </div>
  );
}
