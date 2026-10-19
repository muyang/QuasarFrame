/** Existing static catalogue: do not upgrade to surveyed positions without evidence. */
export function getLocationProvenance() {
  return {
    timeZone: 'Asia/Shanghai',
    source: '项目内置地点资料（待现场核验）',
    coordinateSystem: '未标注，日照暂按 WGS84 近似计算',
    note: '坐标仅保留至 0.01°，为地点级示意；海拔基准与坐标精度未核验，不用于精确机位导航。',
  };
}
