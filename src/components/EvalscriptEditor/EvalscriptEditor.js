import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { ExclamationIcon } from '@heroicons/react/solid';
import store, { s1batchSlice } from '../../store';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { DEFAULT_EVALSCRIPTS } from '../../const';
import { JSHINT } from 'jshint';
import Modal from '../Modal/Modal';

require('codemirror/lib/codemirror.css');
require('codemirror/theme/eclipse.css');
require('codemirror/theme/neat.css');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/lint/javascript-lint');
require('codemirror/addon/lint/lint.css');
require('codemirror/addon/lint/lint.js');
require('codemirror/addon/edit/closebrackets.js');
require('codemirror/addon/selection/active-line.js');

window.JSHINT = JSHINT;

const EvalscriptEditor = ({ datasource = 'S1GRD', evalscript, token }) => {
  const [isOnReadOnly, setIsOnReadOnly] = useState(true);
  const handleChange = (code) => {
    store.dispatch(s1batchSlice.actions.setEvalscript(code));
  };

  const handleSetDefaultEvalscript = () => {
    const defaultEvalscript = DEFAULT_EVALSCRIPTS[datasource];
    store.dispatch(s1batchSlice.actions.setEvalscript(defaultEvalscript));
  };

  const handleEditEvalscript = useCallback(
    (handleClose) => () => {
      setIsOnReadOnly(false);
      handleClose();
    },
    [],
  );

  return (
    <>
      <div className="flex items-center p-2">
        <h2 className="heading-secondary mr-2">Evalscript</h2>
        <button
          style={{ marginRight: '2rem' }}
          className="secondary-button"
          onClick={handleSetDefaultEvalscript}
        >
          Set evalscript to default
        </button>
      </div>
      <div className="form">
        {isOnReadOnly && (
          <Modal
            trigger={(handleOpen) => (
              <button className="secondary-button w-fit mb-2" onClick={handleOpen}>
                Edit evalscript
              </button>
            )}
            style={{ height: '200px' }}
          >
            {(handleClose) => (
              <div className="flex flex-col items-center justify-center">
                <p className="flex">
                  <ExclamationIcon className="w-5 text-yellow-600 mr-2" />
                  Editing the evalscript can break the generation of CARD4L compliant products. Proceed at
                  your own risk.
                </p>
                <div className="flex items-center mt-3">
                  <button className="secondary-button mr-3" onClick={handleEditEvalscript(handleClose)}>
                    Proceed
                  </button>
                  <button className="secondary-button secondary-button--cancel" onClick={handleClose}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )}

        <CodeMirror
          value={evalscript}
          options={{
            mode: 'javascript',
            theme: 'eclipse',
            readOnly: isOnReadOnly,
            lint: {
              esversion: 6,
            },
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            gutters: ['CodeMirror-lint-markers'],
            styleActiveLine: true,
            extraKeys: {
              Tab: (cm) => {
                var spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
                cm.replaceSelection(spaces);
              },
            },
          }}
          onBeforeChange={(editor, data, value) => {
            handleChange(value);
          }}
          className="editor"
        />
      </div>
    </>
  );
};

const mapStateToProps = (store) => ({
  evalscript: store.s1odc.evalscript,
  datasource: store.s1odc.datasource,
  token: store.auth.user.access_token,
});

export default connect(mapStateToProps, null)(EvalscriptEditor);
