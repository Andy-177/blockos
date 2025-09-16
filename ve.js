// ve.js - 基于BlockOS终端的文本编辑器
(function() {
    // 编辑器状态
    const veState = {
        isActive: false,         // 编辑器是否激活
        currentFile: null,       // 当前编辑的文件
        content: [],             // 文件内容行数组
        cursor: {
            row: 0,              // 光标行号（0-based）
            col: 0               // 光标列号（0-based）
        },
        clipboard: '',           // 剪贴板内容
        originalConsole: null    // 保存原始控制台方法
    };

    // 注册ve命令
    function registerVeCommand() {
        CommandManager.register(
            've',
            function(args) {
                if (args.length === 0) {
                    showHelp();
                    return;
                }

                const subCmd = args[0].toLowerCase();
                const subArgs = args.slice(1);

                // 处理需要编辑器激活的命令
                if (!veState.isActive && !['open', 'help'].includes(subCmd)) {
                    console.error('请先使用 ve open <文件名> 打开一个文件');
                    return;
                }

                switch (subCmd) {
                    case 'open':
                        handleOpen(subArgs);
                        break;
                    case 'move':
                        handleMove(subArgs);
                        break;
                    case 'line':
                        handleLine(subArgs);
                        break;
                    case 'break':
                        handleBreak();
                        break;
                    case 'write':
                        handleWrite(subArgs);
                        break;
                    case 'del':
                        handleDelete(subArgs);
                        break;
                    case 'copy':
                        handleCopy(subArgs);
                        break;
                    case 'paste':
                        handlePaste(subArgs);
                        break;
                    case 'space':
                        handleSpace(subArgs);
                        break;
                    case 'q':
                        handleQuit(false);
                        break;
                    case 's':
                        handleSave();
                        break;
                    case 'qs':
                        handleSave();
                        handleQuit(true);
                        break;
                    case 'help':
                        showHelp();
                        break;
                    default:
                        console.error(`未知的ve子命令: ${subCmd}`);
                        showHelp();
                }
            },
            '文本编辑器 - 使用 ve help 查看帮助'
        );
    }

    // 显示帮助信息
    function showHelp() {
        console.log('=== ve编辑器命令帮助 ===');
        console.log('ve open <文件名>         - 打开文件进行编辑');
        console.log('ve move left/right [数量] - 移动光标（默认1格）');
        console.log('ve move start            - 将光标移动到当前行首');
        console.log('ve move end              - 将光标移动到当前行尾');
        console.log('ve line <行号>           - 将光标移动到指定行');
        console.log('ve line start            - 将光标移动到第一行');
        console.log('ve line end              - 将光标移动到最后一行');
        console.log('ve break                 - 在光标位置换行');
        console.log('ve write <内容>          - 在光标前写入内容');
        console.log('ve space [数量]          - 在光标前插入空格（默认1个）');
        console.log('ve del [数量]            - 删除光标前指定数量字符（默认1个）');
        console.log('ve del range all         - 删除全部内容');
        console.log('ve del range <开始> <结束> - 删除指定范围内容');
        console.log('ve copy                  - 复制全部内容');
        console.log('ve copy range <开始> <结束> - 复制指定范围内容');
        console.log('ve paste                 - 在光标前粘贴内容');
        console.log('ve paste range <开始> <结束> - 剪切指定范围并粘贴');
        console.log('ve q                     - 退出编辑器（不保存）');
        console.log('ve s                     - 保存文件');
        console.log('ve qs                    - 保存并退出');
    }

    // 打开文件
    function handleOpen(args) {
        if (args.length === 0) {
            console.error('请指定文件名: ve open <文件名>');
            return;
        }

        const fileName = args[0];
        const fileInfo = getNodeByPath(fileName);

        if (!fileInfo || fileInfo.isRoot || fileInfo.node.type !== 'file') {
            console.error(`文件 ${fileName} 不存在，创建新文件`);
            // 创建新文件
            const currentDirInfo = getNodeByPath('.');
            if (currentDirInfo && !currentDirInfo.isRoot && currentDirInfo.node.type === 'directory') {
                currentDirInfo.node.children[fileName] = {
                    name: fileName,
                    type: 'file',
                    content: ''
                };
            }
            veState.content = [''];
            veState.currentFile = fileName;
        } else {
            // 打开现有文件
            veState.content = fileInfo.node.content.split('\n');
            veState.currentFile = fileName;
            console.log(`已打开文件: ${fileName}`);
        }

        // 初始化光标位置
        veState.cursor = { row: 0, col: 0 };
        veState.isActive = true;
        veState.clipboard = '';

        // 重定向控制台输出以显示编辑器界面
        redirectConsole();
        
        // 显示初始内容
        renderEditor();
    }

    // 移动光标
    function handleMove(args) {
        if (args.length === 0) {
            console.error('请指定方向: ve move left/right [数量] 或 ve move start/end');
            return;
        }

        const direction = args[0].toLowerCase();
        const count = args.length > 1 ? parseInt(args[1]) : 1;

        const currentLine = veState.content[veState.cursor.row] || '';
        
        if (direction === 'left') {
            if (isNaN(count) || count <= 0) {
                console.error('数量必须是正整数');
                return;
            }
            veState.cursor.col = Math.max(0, veState.cursor.col - count);
        } else if (direction === 'right') {
            if (isNaN(count) || count <= 0) {
                console.error('数量必须是正整数');
                return;
            }
            veState.cursor.col = Math.min(currentLine.length, veState.cursor.col + count);
        } else if (direction === 'start') {
            // 移动到行首
            veState.cursor.col = 0;
        } else if (direction === 'end') {
            // 移动到行尾
            veState.cursor.col = currentLine.length;
        } else {
            console.error('方向必须是 left, right, start 或 end');
            return;
        }

        renderEditor();
    }

    // 移动到指定行
    function handleLine(args) {
        if (args.length === 0) {
            console.error('请指定行号: ve line <行号> 或 ve line start/end');
            return;
        }

        const lineSpec = args[0].toLowerCase();
        
        if (lineSpec === 'start') {
            // 移动到第一行
            veState.cursor.row = 0;
        } else if (lineSpec === 'end') {
            // 移动到最后一行
            veState.cursor.row = veState.content.length - 1;
        } else {
            // 移动到指定行号
            const lineNum = parseInt(lineSpec);
            if (isNaN(lineNum) || lineNum < 1 || lineNum > veState.content.length) {
                console.error(`行号必须在 1 到 ${veState.content.length} 之间`);
                return;
            }
            veState.cursor.row = lineNum - 1; // 转换为0-based索引
        }

        // 将光标移动到该行的最大可能位置
        const lineLength = veState.content[veState.cursor.row].length;
        veState.cursor.col = Math.min(veState.cursor.col, lineLength);

        renderEditor();
    }

    // 换行
    function handleBreak() {
        const currentRow = veState.cursor.row;
        const currentCol = veState.cursor.col;
        const currentLine = veState.content[currentRow] || '';

        // 分割当前行
        const linePart1 = currentLine.substring(0, currentCol);
        const linePart2 = currentLine.substring(currentCol);

        // 更新内容
        veState.content[currentRow] = linePart1;
        veState.content.splice(currentRow + 1, 0, linePart2);

        // 移动光标到新行的开头
        veState.cursor.row = currentRow + 1;
        veState.cursor.col = 0;

        renderEditor();
    }

    // 写入内容
    function handleWrite(args) {
        if (args.length === 0) {
            console.error('请指定要写入的内容: ve write <内容>');
            return;
        }

        const text = args.join(' ');
        const currentRow = veState.cursor.row;
        const currentCol = veState.cursor.col;
        const currentLine = veState.content[currentRow] || '';

        // 在光标位置插入文本
        const newLine = currentLine.substring(0, currentCol) + text + currentLine.substring(currentCol);
        veState.content[currentRow] = newLine;

        // 移动光标
        veState.cursor.col += text.length;

        renderEditor();
    }

    // 插入空格
    function handleSpace(args) {
        const count = args.length > 0 ? parseInt(args[0]) : 1;
        
        if (isNaN(count) || count <= 0) {
            console.error('数量必须是正整数');
            return;
        }
        
        // 生成指定数量的空格
        const spaces = ' '.repeat(count);
        const currentRow = veState.cursor.row;
        const currentCol = veState.cursor.col;
        const currentLine = veState.content[currentRow] || '';

        // 在光标位置插入空格
        const newLine = currentLine.substring(0, currentCol) + spaces + currentLine.substring(currentCol);
        veState.content[currentRow] = newLine;

        // 移动光标
        veState.cursor.col += count;

        renderEditor();
    }

    // 删除操作
    function handleDelete(args) {
        if (args.length === 0) {
            // 默认删除光标前一个字符
            deleteChars(1);
            return;
        }

        if (args[0] === 'range') {
            if (args.length < 2) {
                console.error('请指定删除范围: ve del range <开始> <结束> 或 ve del range all');
                return;
            }

            if (args[1] === 'all') {
                // 删除全部内容
                veState.content = [''];
                veState.cursor = { row: 0, col: 0 };
                renderEditor();
                return;
            }

            // 处理范围删除
            if (args.length < 3) {
                // 同一行内的范围
                const startCol = parseInt(args[1]) - 1; // 转换为0-based
                const endCol = parseInt(args[2]) - 1;
                
                if (isNaN(startCol) || isNaN(endCol) || startCol < 0 || endCol < startCol) {
                    console.error('无效的范围参数');
                    return;
                }

                const currentRow = veState.cursor.row;
                const currentLine = veState.content[currentRow] || '';
                
                if (endCol >= currentLine.length) {
                    console.error('结束位置超出行长度');
                    return;
                }

                // 删除范围内的字符
                const newLine = currentLine.substring(0, startCol) + currentLine.substring(endCol + 1);
                veState.content[currentRow] = newLine;

                // 调整光标位置
                veState.cursor.col = Math.min(startCol, newLine.length);
                
            } else {
                // 跨多行范围
                // 解析开始位置 "行,列"
                const startPos = args[1].split(',');
                const startRow = parseInt(startPos[0]) - 1;
                const startCol = parseInt(startPos[1]) - 1;
                
                // 解析结束位置 "行,列"
                const endPos = args[2].split(',');
                const endRow = parseInt(endPos[0]) - 1;
                const endCol = parseInt(endPos[1]) - 1;

                if (isNaN(startRow) || isNaN(startCol) || isNaN(endRow) || isNaN(endCol) ||
                    startRow < 0 || endRow < startRow || endRow >= veState.content.length) {
                    console.error('无效的范围参数');
                    return;
                }

                // 处理单行范围
                if (startRow === endRow) {
                    const currentLine = veState.content[startRow] || '';
                    if (startCol < 0 || endCol < startCol || endCol >= currentLine.length) {
                        console.error('无效的列范围');
                        return;
                    }
                    
                    const newLine = currentLine.substring(0, startCol) + currentLine.substring(endCol + 1);
                    veState.content[startRow] = newLine;
                    veState.cursor = { row: startRow, col: startCol };
                } else {
                    // 处理多行范围
                    // 1. 处理起始行
                    const startLine = veState.content[startRow] || '';
                    veState.content[startRow] = startLine.substring(0, startCol);
                    
                    // 2. 处理结束行
                    const endLine = veState.content[endRow] || '';
                    const remainingEndLine = endLine.substring(endCol + 1);
                    
                    // 3. 合并起始行和结束行剩余部分
                    veState.content[startRow] += remainingEndLine;
                    
                    // 4. 删除中间行和结束行
                    veState.content.splice(startRow + 1, endRow - startRow);
                    
                    // 5. 调整光标位置
                    veState.cursor = { row: startRow, col: startCol };
                }
            }

            renderEditor();
            return;
        }

        // 处理删除指定数量的字符
        const count = parseInt(args[0]);
        if (isNaN(count) || count <= 0) {
            console.error('数量必须是正整数');
            return;
        }

        deleteChars(count);
    }

    // 删除光标前指定数量的字符
    function deleteChars(count) {
        const currentRow = veState.cursor.row;
        const currentCol = veState.cursor.col;
        
        if (currentCol === 0) {
            // 光标在行首，合并到上一行
            if (currentRow === 0) {
                console.log('已在文件开头，无法删除');
                return;
            }
            
            // 获取上一行内容
            const prevRow = currentRow - 1;
            const prevLine = veState.content[prevRow] || '';
            const currentLine = veState.content[currentRow] || '';
            
            // 合并行
            veState.content[prevRow] = prevLine + currentLine;
            // 删除当前行
            veState.content.splice(currentRow, 1);
            // 移动光标到上一行末尾
            veState.cursor = {
                row: prevRow,
                col: prevLine.length
            };
        } else {
            // 正常删除字符
            const currentLine = veState.content[currentRow] || '';
            const deleteCount = Math.min(count, currentCol);
            const newLine = currentLine.substring(0, currentCol - deleteCount) + currentLine.substring(currentCol);
            veState.content[currentRow] = newLine;
            veState.cursor.col -= deleteCount;
        }

        renderEditor();
    }

    // 复制操作
    function handleCopy(args) {
        if (args.length === 0) {
            // 复制全部内容
            veState.clipboard = veState.content.join('\n');
            console.log('已复制全部内容到剪贴板');
            renderEditor();
            return;
        }

        if (args[0] === 'range' && args.length >= 3) {
            // 复制指定范围
            try {
                let startRow, startCol, endRow, endCol;
                
                if (args.length === 3) {
                    // 同一行内的范围
                    startRow = veState.cursor.row;
                    endRow = veState.cursor.row;
                    startCol = parseInt(args[1]) - 1;
                    endCol = parseInt(args[2]) - 1;
                } else {
                    // 跨多行范围
                    const startPos = args[1].split(',');
                    startRow = parseInt(startPos[0]) - 1;
                    startCol = parseInt(startPos[1]) - 1;
                    
                    const endPos = args[2].split(',');
                    endRow = parseInt(endPos[0]) - 1;
                    endCol = parseInt(endPos[1]) - 1;
                }

                if (isNaN(startRow) || isNaN(startCol) || isNaN(endRow) || isNaN(endCol) ||
                    startRow < 0 || endRow < startRow || endRow >= veState.content.length) {
                    throw new Error('无效的范围参数');
                }

                let copyContent = '';
                
                if (startRow === endRow) {
                    // 单行复制
                    const line = veState.content[startRow] || '';
                    if (startCol < 0 || endCol < startCol || endCol >= line.length) {
                        throw new Error('无效的列范围');
                    }
                    copyContent = line.substring(startCol, endCol + 1);
                } else {
                    // 多行复制
                    // 起始行
                    const startLine = veState.content[startRow] || '';
                    copyContent += startLine.substring(startCol) + '\n';
                    
                    // 中间行
                    for (let i = startRow + 1; i < endRow; i++) {
                        copyContent += veState.content[i] + '\n';
                    }
                    
                    // 结束行
                    const endLine = veState.content[endRow] || '';
                    copyContent += endLine.substring(0, endCol + 1);
                }

                veState.clipboard = copyContent;
                console.log('已复制指定范围内容到剪贴板');
            } catch (error) {
                console.error(`复制失败: ${error.message}`);
            }
            
            renderEditor();
            return;
        }

        console.error('无效的复制命令，使用 ve copy 或 ve copy range <范围>');
    }

    // 粘贴操作
    function handlePaste(args) {
        if (veState.clipboard === '') {
            console.log('剪贴板为空');
            return;
        }

        if (args.length === 0) {
            // 简单粘贴
            pasteContent(veState.clipboard);
            return;
        }

        if (args[0] === 'range' && args.length >= 3) {
            // 剪切指定范围并粘贴
            try {
                let startRow, startCol, endRow, endCol;
                
                if (args.length === 3) {
                    // 同一行内的范围
                    startRow = veState.cursor.row;
                    endRow = veState.cursor.row;
                    startCol = parseInt(args[1]) - 1;
                    endCol = parseInt(args[2]) - 1;
                } else {
                    // 跨多行范围
                    const startPos = args[1].split(',');
                    startRow = parseInt(startPos[0]) - 1;
                    startCol = parseInt(startPos[1]) - 1;
                    
                    const endPos = args[2].split(',');
                    endRow = parseInt(endPos[0]) - 1;
                    endCol = parseInt(endPos[1]) - 1;
                }

                // 先保存要剪切的内容
                let cutContent = '';
                if (startRow === endRow) {
                    const line = veState.content[startRow] || '';
                    cutContent = line.substring(startCol, endCol + 1);
                } else {
                    const startLine = veState.content[startRow] || '';
                    cutContent += startLine.substring(startCol) + '\n';
                    
                    for (let i = startRow + 1; i < endRow; i++) {
                        cutContent += veState.content[i] + '\n';
                    }
                    
                    const endLine = veState.content[endRow] || '';
                    cutContent += endLine.substring(0, endCol + 1);
                }

                // 删除指定范围内容
                if (startRow === endRow) {
                    const line = veState.content[startRow] || '';
                    veState.content[startRow] = line.substring(0, startCol) + line.substring(endCol + 1);
                    veState.cursor = { row: startRow, col: startCol };
                } else {
                    const startLine = veState.content[startRow] || '';
                    veState.content[startRow] = startLine.substring(0, startCol);
                    
                    const endLine = veState.content[endRow] || '';
                    const remainingEndLine = endLine.substring(endCol + 1);
                    
                    veState.content[startRow] += remainingEndLine;
                    veState.content.splice(startRow + 1, endRow - startRow);
                    
                    veState.cursor = { row: startRow, col: startCol };
                }

                // 粘贴剪切的内容
                veState.clipboard = cutContent;
                pasteContent(cutContent);
                
                console.log('已剪切并粘贴指定范围内容');
            } catch (error) {
                console.error(`剪切粘贴失败: ${error.message}`);
            }
            
            renderEditor();
            return;
        }

        console.error('无效的粘贴命令，使用 ve paste 或 ve paste range <范围>');
    }

    // 粘贴内容到光标位置
    function pasteContent(content) {
        const lines = content.split('\n');
        const currentRow = veState.cursor.row;
        const currentCol = veState.cursor.col;
        const currentLine = veState.content[currentRow] || '';

        if (lines.length === 1) {
            // 单行内容，直接插入
            const newLine = currentLine.substring(0, currentCol) + lines[0] + currentLine.substring(currentCol);
            veState.content[currentRow] = newLine;
            veState.cursor.col += lines[0].length;
        } else {
            // 多行内容，需要拆分处理
            // 1. 处理当前行
            const firstLine = lines[0];
            const remainingLines = lines.slice(1);
            const newCurrentLine = currentLine.substring(0, currentCol) + firstLine;
            veState.content[currentRow] = newCurrentLine;
            
            // 2. 插入剩余行
            veState.content.splice(currentRow + 1, 0, ...remainingLines);
            
            // 3. 调整光标位置
            veState.cursor.row = currentRow + remainingLines.length;
            veState.cursor.col = remainingLines.length > 0 
                ? remainingLines[remainingLines.length - 1].length 
                : currentCol + firstLine.length;
        }

        renderEditor();
    }

    // 保存文件
    function handleSave() {
        if (!veState.currentFile) {
            console.error('没有打开的文件');
            return;
        }

        const fileInfo = getNodeByPath(veState.currentFile);
        if (fileInfo && !fileInfo.isRoot && fileInfo.node.type === 'file') {
            fileInfo.node.content = veState.content.join('\n');
            console.log(`文件 ${veState.currentFile} 已保存`);
        } else {
            console.error(`无法保存文件 ${veState.currentFile}: 文件不存在`);
        }

        renderEditor();
    }

    // 退出编辑器
    function handleQuit(saved) {
        if (!saved) {
            console.log(`已退出编辑器，未保存的更改将丢失`);
        }
        
        veState.isActive = false;
        veState.currentFile = null;
        
        // 恢复原始控制台
        restoreConsole();
    }

    // 重定向控制台输出以显示编辑器界面
    function redirectConsole() {
        if (veState.originalConsole) return;
        
        veState.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };

        // 重写控制台方法，确保编辑器界面始终显示
        console.log = function(...args) {
            veState.originalConsole.log(...args);
            renderEditor();
        };

        console.error = function(...args) {
            veState.originalConsole.error(...args);
            renderEditor();
        };

        console.warn = function(...args) {
            veState.originalConsole.warn(...args);
            renderEditor();
        };
    }

    // 恢复原始控制台
    function restoreConsole() {
        if (veState.originalConsole) {
            console.log = veState.originalConsole.log;
            console.error = veState.originalConsole.error;
            console.warn = veState.originalConsole.warn;
            veState.originalConsole = null;
        }
    }

    // 渲染编辑器界面
    function renderEditor() {
        if (!veState.isActive) return;
        
        // 清空输出
        outputDiv.innerHTML = '';
        
        // 显示文件名
        const fileLine = document.createElement('p');
        fileLine.className = 'info';
        fileLine.textContent = `正在编辑: ${veState.currentFile}`;
        outputDiv.appendChild(fileLine);
        
        // 显示分隔线
        const separator = document.createElement('p');
        separator.className = 'log';
        separator.textContent = repeatChar('-', 40);
        outputDiv.appendChild(separator);
        
        // 显示内容和行号
        veState.content.forEach((line, rowIndex) => {
            const lineElement = document.createElement('p');
            lineElement.className = 'log';
            
            // 行号 - 蓝色[]和红色数字
            const lineNumber = document.createElement('span');
            lineNumber.style.color = '#00ffff'; // 蓝色
            lineNumber.textContent = '[';
            
            const lineNumValue = document.createElement('span');
            lineNumValue.style.color = '#ff4d4d'; // 红色
            lineNumValue.textContent = (rowIndex + 1).toString();
            
            const lineNumberEnd = document.createElement('span');
            lineNumberEnd.style.color = '#00ffff'; // 蓝色
            lineNumberEnd.textContent = '] ';
            
            // 文本内容
            const textContent = document.createElement('span');
            
            // 处理光标显示
            if (rowIndex === veState.cursor.row) {
                // 光标所在行
                const beforeCursor = line.substring(0, veState.cursor.col);
                const afterCursor = line.substring(veState.cursor.col);
                
                const beforeSpan = document.createElement('span');
                beforeSpan.textContent = beforeCursor;
                
                const cursorSpan = document.createElement('span');
                cursorSpan.style.color = '#ff4d4d'; // 红色光标
                cursorSpan.textContent = '█';
                
                const afterSpan = document.createElement('span');
                afterSpan.textContent = afterCursor;
                
                textContent.appendChild(beforeSpan);
                textContent.appendChild(cursorSpan);
                textContent.appendChild(afterSpan);
            } else {
                // 普通行
                textContent.textContent = line;
            }
            
            // 组合行元素
            lineElement.appendChild(lineNumber);
            lineElement.appendChild(lineNumValue);
            lineElement.appendChild(lineNumberEnd);
            lineElement.appendChild(textContent);
            
            outputDiv.appendChild(lineElement);
        });
        
        // 显示分隔线
        outputDiv.appendChild(separator.cloneNode(true));
        
        // 显示提示信息
        const hintLine = document.createElement('p');
        hintLine.className = 'info';
        hintLine.textContent = `光标位置: 行 ${veState.cursor.row + 1}, 列 ${veState.cursor.col + 1} | 输入 ve help 查看命令`;
        outputDiv.appendChild(hintLine);
        
        scrollToBottom();
    }

    // 工具函数：生成重复字符
    function repeatChar(char, count) {
        return new Array(count + 1).join(char);
    }

    // 初始化 - 注册ve命令
    registerVeCommand();
})();
