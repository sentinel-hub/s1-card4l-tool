import React, { useState } from 'react';
import moment from 'moment';

import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';
import 'react-day-picker/lib/style.css';
import DayPickerInput from 'react-day-picker/DayPickerInput';

export const utcDateToYYYYMMDDFormat = (utcDate) => utcDate.split('T')[0];

const validFromMoment = (momentObj) => momentObj.isSameOrAfter('2014-01-01');

const today = moment.utc().endOf('day');
const validToMoment = (momentObj, timeFromStr) =>
  momentObj.isSameOrBefore(today) && momentObj.isSameOrAfter(timeFromStr);

const validStringDate = (s) => /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/gm.test(s);

const TimeRangeSelect = ({ timeTo, timeFrom }) => {
  const [isValidTimeFrom, setIsValidTimeFrom] = useState(true);
  const [isValidTimeTo, setIsValidTimeTo] = useState(true);

  const handleTimeFromChange = async (d, _, inputComponent) => {
    const stringInputState = inputComponent?.state?.value;
    if (d && validStringDate(stringInputState)) {
      const date = moment(d).utc().startOf('day');
      if (validFromMoment(date)) {
        store.dispatch(s1batchSlice.actions.setTimeFrom(date.format()));
        if (!isValidTimeFrom) {
          setIsValidTimeFrom(true);
        }
      } else {
        setIsValidTimeFrom(false);
      }
    } else {
      setIsValidTimeFrom(false);
    }
  };

  const handleTimeToChange = async (d, _, inputComponent) => {
    const stringInputState = inputComponent?.state?.value;
    if (d && validStringDate(stringInputState)) {
      const date = moment(d).utc().endOf('day');
      if (validToMoment(date, timeFrom)) {
        store.dispatch(s1batchSlice.actions.setTimeTo(date.format()));
        if (!isValidTimeTo) {
          setIsValidTimeTo(true);
        }
      } else {
        setIsValidTimeTo(false);
      }
    } else {
      setIsValidTimeTo(false);
    }
  };

  const handleFormatDate = (date) => {
    const d = moment(date).utc().startOf('day').format();
    return d.split('T')[0];
  };

  return (
    <>
      <h2 className="heading-secondary">Time Range</h2>
      <div className="form">
        <label htmlFor="timefrom" className="form__label">
          From
        </label>
        <DayPickerInput
          value={utcDateToYYYYMMDDFormat(timeFrom)}
          onDayChange={handleTimeFromChange}
          dayPickerProps={{
            selectedDay: timeFrom,
            showOutsideDays: true,
            disabledDays: { after: new Date(), before: new Date(2014, 0, 1) },
          }}
          formatDate={handleFormatDate}
          inputProps={{
            required: true,
            className: `form__input ${!isValidTimeFrom ? 'timerange-input--invalid' : ''}`,
            id: 'timefrom',
          }}
        />

        <label htmlFor="timeto" className="form__label mt-2">
          To
        </label>

        <DayPickerInput
          value={utcDateToYYYYMMDDFormat(timeTo)}
          onDayChange={handleTimeToChange}
          dayPickerProps={{
            selectedDay: timeTo,
            showOutsideDays: true,
            disabledDays: { after: new Date(), before: new Date(timeFrom) },
          }}
          formatDate={handleFormatDate}
          inputProps={{
            required: true,
            className: `form__input ${!isValidTimeTo ? 'timerange-input--invalid' : ''}`,
            id: 'timeto',
          }}
        />
      </div>
    </>
  );
};

const mapStateToProps = (store) => ({
  timeTo: store.s1odc.timeTo,
  timeFrom: store.s1odc.timeFrom,
});

export default connect(mapStateToProps)(TimeRangeSelect);
