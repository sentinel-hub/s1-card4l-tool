export const polarizationToResponses = {
  SH: ['HH'],
  SV: ['VV'],
  DH: ['HH', 'HV'],
  DV: ['VV', 'VH'],
  HH: ['HH'],
  HV: ['HV'],
  VV: ['VV'],
  VH: ['VH'],
};

export const evalscriptByResponses = (responses) => `//VERSION=3
function setup() {
  return {
    input: [{bands:[${responses
      .map((resp) => `"${resp}", `)
      .join('')}"scatteringArea", "localIncidenceAngle", "shadowMask", "dataMask"], metadata: ["bounds"]}],
    output: [
      ${responses
        .map(
          (resp) => `{
      id: "${resp}",
      bands: 1,
      sampleType: "FLOAT32",
      nodataValue: NaN,
      },`,
        )
        .join('')}{
      id: "AREA",
      bands: 1,
      sampleType: "FLOAT32",
      nodataValue: NaN,
      },{
      id: "ANGLE",
      bands: 1,
      sampleType: "UINT8",
      nodataValue: 255
      },{
      id: "MASK",
      bands: 1,
      sampleType: "UINT8",
      nodataValue: 0,
      }
    ]
  };
}

function evaluatePixel(samples) {
  return {${responses.map((resp) => `\n    ${resp}: [samples.${resp}],`).join('')}
    AREA: [samples.scatteringArea],
    ANGLE: [samples.dataMask == 0 ? 255 : samples.localIncidenceAngle],
    MASK: [samples.shadowMask == 1 ? 2 : samples.dataMask]
  };
}

function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {
  outputMetadata.userData = {"tiles": scenes.tiles, "serviceVersion": inputMetadata.serviceVersion };
}

`;
