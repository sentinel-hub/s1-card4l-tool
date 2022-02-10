import React from 'react';

export function numberWithSeparator(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const CatalogInfo = ({ distinctDates, amountDatatakes, totalArea, failedDatatakes }) => {
  return (
    <div>
      <table summary="Catalog Analysed Data" className="catalog-info-table">
        <caption>Information from the Catalog</caption>
        <thead>
          <tr>
            <th scope="col">Number of Datatakes</th>
            <th scope="col">Number of distinct dates</th>
            <th scope="col">Total Area (in sqKm)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{numberWithSeparator(amountDatatakes)}</td>
            <td>{numberWithSeparator(distinctDates)}</td>
            <td>{numberWithSeparator(Math.round(totalArea / 1e6))}</td>
          </tr>
        </tbody>
      </table>
      {failedDatatakes.map((datatake) => (
        <p className="text text--warning" key={datatake}>
          Datatake with id: {datatake} failed while merging geometries and will NOT be included in this order.
        </p>
      ))}
      {failedDatatakes.length > 0 && (
        <p className="text text--warning">
          Sometimes repeating the Search and Analyse step can fix this issue.
        </p>
      )}
    </div>
  );
};

export default CatalogInfo;
