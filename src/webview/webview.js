import { provideVSCodeDesignSystem, vsCodeDataGrid, vsCodeDataGridCell, vsCodeDataGridRow } from '@vscode/webview-ui-toolkit';

const vscode = acquireVsCodeApi();
provideVSCodeDesignSystem().register(vsCodeDataGrid(), vsCodeDataGridRow(), vsCodeDataGridCell());
let currentRowData = null;

(function () {

    var table =  /** @type {HTMLElement} */ (document.getElementById("resource-table"));

    table.onclick = cellClick;
    table.oncontextmenu = cellRightClick;

    function cellRightClick(cell) {
        const sourceElement = cell.target;
        currentRowData = sourceElement._rowData;
    }

    function cellClick(cell) {
        const sourceElement = cell.target;
        currentRowData = sourceElement._rowData;

        if (sourceElement && sourceElement.className !== "column-header") {

            const handleChange = (target) => {
                const column = target._columnDefinition;
                const originalRow = target._rowData;
                const originalValue = originalRow[column.columnDataKey];
                const newValue = target.innerText;


                if (originalValue !== newValue) {
                    sendLog("Value changed...Original value: " + originalValue + "; " + "New value: " + newValue);
                    target._rowData[column.columnDataKey] = newValue;
                    refreshResxData();
                }

                sourceElement.setAttribute("contenteditable", false);

                sourceElement.onkeydown = undefined;
                sourceElement.onblur = undefined;
            };

            sourceElement.onkeydown = (event) => {
                if (event.code === "Enter") {
                    event.preventDefault();
                    handleChange(event.target);
                    return false;
                }
            };

            sourceElement.onblur = (event) => {
                event.preventDefault();
                handleChange(event.target);
                return false;
            };

            sourceElement.setAttribute("contenteditable", true);
        }
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                if (text !== vscode.getState()?.text) {
                    updateContent(text);
                }

                vscode.setState({ text });

                return;
            case 'delete':
                sendLog("Deleting row: " + JSON.stringify(currentRowData));
                if (currentRowData) {
                    const index = table.rowsData.indexOf(currentRowData);
                    if (index > -1) {
                        table.rowsData.splice(index, 1);
                        refreshResxData();
                    }
                }
                else {
                    vscode.postMessage({
                        type: 'info',
                        message: `No selected resource selected. Please select a resource to delete.`
                    });
                }
                return;
            case 'add':
                sendLog(`Adding new resource: Key: ${message.key}, Value: ${message.value}, Comment: ${message.comment}`);
                if (message.key) {
                    const index = table.rowsData.findIndex(x => x.Key === message.key);
                    if (index === -1) {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        table.rowsData.push({ Key: message.key, Value: message.value, Comment: message.comment });
                        refreshResxData();
                    }
                    else {
                        // create vscode notification
                        vscode.postMessage({
                            type: 'error',
                            message: `Key "${message.key}" already exists.`
                        });
                    }
                }
                return;
        }
    });

    function refreshResxData() {
        var obj = {};
        for (var i = 0; i < table.rowsData.length; i++) {
            var key = table.rowsData[i].Key;
            var value = table.rowsData[i].Value;
            var comment = table.rowsData[i].Comment;
            obj[key] = { value: value, comment: comment };
        }

        vscode.setState({ text: JSON.stringify(obj) });
        vscode.postMessage({
            type: 'update',
            json: JSON.stringify(obj)
        });
    }

    function sendLog(message) {
        vscode.postMessage({
            type: 'log',
            message: message
        });
    }

    function updateContent(/** @type {string} **/ text) {
        if (text) {

            var resxValues = [];

            let json;
            try {
                json = JSON.parse(text);
            }
            catch
            {
                console.log("error parsing json");
                return;
            }

            for (const node in json || []) {
                if (node) {
                    let res = json[node];
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    var item = { Key: node, "Value": res.value || '', "Comment": res.comment || '' };
                    resxValues.push(item);
                }
                else {
                    console.log('node is undefined or null');
                }
            }

            table.rowsData = resxValues;
        }
        else {
            console.log("text is null");
            return;
        }
    }

    const state = vscode.getState();
    if (state) {
        updateContent(state.text);
    }
})();