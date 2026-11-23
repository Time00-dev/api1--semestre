import { geographic, type Row } from './data';
import { territoryName } from './territorySearch';

export function TerritoryLabel({ row, query }: { row: Row; query?: string }) {
  return <span className="territory-label">
    <span className="territory-name">{territoryName(row, query)}</span>
    <small className="territory-code">{geographic(row)}</small>
  </span>;
}
