// 5freunde — project-local ESL ruleset.
//
// Rule `no-foreach-splice` catches the index-skip bug class:
//
//     enemies.forEach((e, i) => {
//         if (e.dead) enemies.splice(i, 1);  // ← skips next element
//     });
//
// `Array.prototype.forEach` continues from the next index regardless of
// in-place mutations, so removing element `i` causes the loop to skip element
// `i+1`. The audit pass on 2026-05-10 found ~11 of these in `game.js` alone.
// The safe pattern is a backwards `for` loop:
//
//     for (let i = enemies.length - 1; i >= 0; i--) {
//         if (enemies[i].dead) enemies.splice(i, 1);
//     }

/** @type {import('eslint').Rule.RuleModule} */
const noForeachSplice = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow Array#splice on the same array inside Array#forEach (index-skip bug)',
            recommended: false,
        },
        schema: [],
        messages: {
            bug: 'forEach + array.splice(index) skips the next element. Use a backwards for-loop instead.',
        },
    },
    create(context) {
        // Stack of { arrayName, indexParam } per active forEach.
        const stack = [];

        return {
            CallExpression(node) {
                // Entering a forEach call: push frame.
                if (
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'forEach' &&
                    node.arguments[0] &&
                    (node.arguments[0].type === 'ArrowFunctionExpression' || node.arguments[0].type === 'FunctionExpression')
                ) {
                    const arrayObj = node.callee.object;
                    const arrayName = arrayObj.type === 'Identifier' ? arrayObj.name : null;
                    const cb = node.arguments[0];
                    // Second callback param is the index. Anonymous forEach with one
                    // param does not own an index — nothing to track in that case.
                    const idxParam = cb.params[1];
                    const idxName = idxParam && idxParam.type === 'Identifier' ? idxParam.name : null;
                    stack.push({ arrayName, idxName });
                    return;
                }

                // Detect array.splice(<index>, ...) inside an active forEach frame.
                if (
                    stack.length > 0 &&
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'splice' &&
                    node.callee.object.type === 'Identifier'
                ) {
                    const top = stack[stack.length - 1];
                    if (!top.arrayName || top.arrayName !== node.callee.object.name) return;
                    if (!top.idxName) return;
                    const firstArg = node.arguments[0];
                    if (firstArg && firstArg.type === 'Identifier' && firstArg.name === top.idxName) {
                        context.report({ node, messageId: 'bug' });
                    }
                }
            },
            'CallExpression:exit'(node) {
                // Pop frame when leaving the matching forEach call.
                if (
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'forEach' &&
                    node.arguments[0] &&
                    (node.arguments[0].type === 'ArrowFunctionExpression' || node.arguments[0].type === 'FunctionExpression')
                ) {
                    stack.pop();
                }
            },
        };
    },
};

export default {
    rules: {
        'no-foreach-splice': noForeachSplice,
    },
};
