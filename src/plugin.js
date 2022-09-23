/**
 * plugin.js
 *
 * Copyright, BuboBox
 * Released under MIT License.
 *
 * License: https://www.bubobox.com
 * Contributing: https://www.bubobox.com/contributing
 */

import tinymce from "tinymce";

tinymce.PluginManager.add("variable", function (editor) {
    /**
   * Object that is used to replace the variable string to be used
   * in the HTML view
   * @type {object}
   */
    const mapper = editor.getParam("variable_mapper", {});

    /**
   * define a list of variables that are allowed
   * if the variable is not in the list it will not be automatically converterd
   * by default no validation is done
   * @type {array}
   */
    const valid = editor.getParam("variable_valid", null);

    /**
   * Get custom variable class name
   * @type {string}
   */
    const className = editor.getParam("variable_class", "variable");

    /**
   * Prefix and suffix to use to mark a variable
   * @type {string}
   */
    const prefix = editor.getParam("variable_prefix", "{{");
    const suffix = editor.getParam("variable_suffix", "}}");
    const stringVariableRegex = new RegExp(prefix + "([a-z. _]*)?" + suffix, "g");

    /**
   * check if a certain variable is valid
   * @param {string} name
   * @return {boolean}
   */
    function isValid(name) {
        if (!valid || valid.length === 0) return true;

        const validString = "|" + valid.join("|") + "|";

        return validString.indexOf("|" + name + "|") > -1;
    }

    function getMappedValue(cleanValue) {
        if (typeof mapper === "function") return mapper(cleanValue);

        return mapper.hasOwnProperty(cleanValue) ? mapper[cleanValue] : cleanValue;
    }

    /**
   * Strip variable to keep the plain variable string
   * @example "{test}" => "test"
   * @param {string} value
   * @return {string}
   */
    function cleanVariable(value) {
        return value.replace(/[^a-zA-Z0-9._]/g, "");
    }

    /**
   * convert a text variable "x" to a span with the needed
   * attributes to style it with CSS
   * @param  {string} value
   * @return {string}
   */
    function createHTMLVariable(value) {
        const cleanValue = cleanVariable(value);

        // check if variable is valid
        if (!isValid(cleanValue)) return value;

        const cleanMappedValue = getMappedValue(cleanValue);

        editor.fire("variableToHTML", {
            value: value,
            cleanValue: cleanValue,
        });

        const variable = prefix + cleanValue + suffix;
        return (
            '<span class="' +
      className +
      '" data-original-variable="' +
      variable +
      '" contenteditable="false">' +
      cleanMappedValue +
      "</span>"
        );
    }

    /**
   * convert variable strings into html elements
   * @return {void}
   */
    function stringToHTML() {
        let nodeList = [],
            nodeValue,
            node,
            div;

        // find nodes that contain a string variable
        tinymce.walk(
            editor.getBody(),
            function (n) {
                if (
                    +n.nodeType === 3 &&
          n.nodeValue &&
          stringVariableRegex.test(n.nodeValue)
                ) {
                    nodeList.push(n);
                }
            },
            "childNodes"
        );

        // loop over all nodes that contain a string variable
        for (let i = 0; i < nodeList.length; i++) {
            nodeValue = nodeList[i].nodeValue.replace(
                stringVariableRegex,
                createHTMLVariable
            );
            div = editor.dom.create("div", null, nodeValue);
            while ((node = div.lastChild)) {
                editor.dom.insertAfter(node, nodeList[i]);

                if (isVariable(node)) {
                    const next = node.nextSibling;
                    editor.selection.setCursorLocation(next);
                }
            }

            editor.dom.remove(nodeList[i]);
        }
    }

    /**
   * convert HTML variables back into their original string format
   * for example when a user opens source view
   * @return {void}
   */
    function htmlToString() {
        let nodeList = [],
            nodeValue,
            node,
            div;

        // find nodes that contain a HTML variable
        tinymce.walk(
            editor.getBody(),
            function (n) {
                if (+n.nodeType === 1) {
                    const original = n.getAttribute("data-original-variable");
                    if (original !== null) {
                        nodeList.push(n);
                    }
                }
            },
            "childNodes"
        );

        // loop over all nodes that contain a HTML variable
        for (let i = 0; i < nodeList.length; i++) {
            nodeValue = nodeList[i].getAttribute("data-original-variable");
            div = editor.dom.create("div", null, nodeValue);
            while ((node = div.lastChild)) {
                editor.dom.insertAfter(node, nodeList[i]);
            }

            // remove HTML variable node
            // because we now have an text representation of the variable
            editor.dom.remove(nodeList[i]);
        }
    }
    /**
   * handle formatting the content of the editor based on
   * the current format. For example if a user switches to source view and back
   * @param  {object} e
   * @return {void}
   */
    function handleContentRerender(e) {
    // store cursor location
        return e.format === "raw" ? stringToHTML() : htmlToString();
    // restore cursor location
    }

    /**
   * insert a variable into the editor at the current cursor location
   * @param {string} value
   * @return {void}
   */
    function addVariable(value) {
        const htmlVariable = createHTMLVariable(value);
        editor.execCommand("mceInsertContent", false, htmlVariable);
    }

    function isVariable(element) {
        return (
            typeof element.getAttribute === "function" &&
      element.hasAttribute("data-original-variable")
        );
    }

    /**
   * Trigger special event when user clicks on a variable
   * @return {void}
   */
    function handleClick(e) {
        const target = e.target;

        if (!isVariable(target)) {
            return;
        }

        const value = target.getAttribute("data-original-variable");
        editor.fire("variableClick", {
            value: cleanVariable(value),
            target: target,
        });
    }

    editor.on("nodechange", stringToHTML);
    editor.on("keyup", stringToHTML);
    editor.on("beforegetcontent", handleContentRerender);
    editor.on("click", handleClick);

    this.addVariable = addVariable;
});
