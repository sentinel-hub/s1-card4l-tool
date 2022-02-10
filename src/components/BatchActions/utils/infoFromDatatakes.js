import area from '@turf/area';

export const getNumberOfDatatakes = (datatakes) => datatakes.length;

// get different days
export const getDifferentDates = (datatakes) => {
  const alreadyCheckedDate = {};
  return datatakes.reduce((acc, datatake) => {
    let day1 = datatake.timeRange[0].split('T')[0];
    let day2 = datatake.timeRange[1].split('T')[0];
    if (!alreadyCheckedDate[day1]) {
      alreadyCheckedDate[day1] = true;
      acc++;
    }
    if (!alreadyCheckedDate[day2]) {
      alreadyCheckedDate[day2] = true;
      acc++;
    }
    return acc;
  }, 0);
};

export const getTotalArea = (datatakes) => {
  return datatakes.reduce((acc, datatake) => acc + area(datatake.geometry), 0);
};
