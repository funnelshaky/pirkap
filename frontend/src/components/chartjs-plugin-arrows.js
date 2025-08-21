// frontend/src/components/chartjs-plugin-arrows.js

function drawArrow(ctx, fromx, fromy, tox, toy, color) {
  const headlen = 10;
  const dx = tox - fromx;
  const dy = toy - fromy;
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fromx, fromy);
  ctx.lineTo(tox, toy);
  ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(tox, toy);
  ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

export const arrowPlugin = {
  id: 'arrowPlugin',
  afterDraw: (chart) => {
    const { ctx } = chart;
    const { drills } = chart.options.plugins.arrowPlugin;

    if (!drills || drills.length === 0) return;

    // 1. Creamos un mapa para buscar la posición de cada taladro en el canvas
    const pointPositions = new Map();
    chart.data.datasets.forEach((dataset, i) => {
      if (dataset.type === 'scatter') {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((pointElement, index) => {
          const drillId = dataset.data[index].id;
          pointPositions.set(drillId, { x: pointElement.x, y: pointElement.y });
        });
      }
    });

    if (pointPositions.size === 0) return;

    ctx.save();

    // 2. Iteramos sobre los taladros y luego sobre sus conexiones de salida
    drills.forEach(fromDrill => {
      if (fromDrill.sequences_from && fromDrill.sequences_from.length > 0) {
        fromDrill.sequences_from.forEach(link => {
          const fromPos = pointPositions.get(link.from_drill_id);
          const toPos = pointPositions.get(link.to_drill_id);

          if (fromPos && toPos) {
            drawArrow(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, '#FF6384');
          }
        });
      }
    });

    ctx.restore();
  }
};