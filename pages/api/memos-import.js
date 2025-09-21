/**
 * Next.js API 路由：处理 Memos 数据库文件导入
 * 在服务器端解析 SQLite 数据库，避免浏览器环境的复杂配置
 */
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import { getDatabase } from '../../lib/server/database-simple.js';

// 配置 API 路由不解析 body，让 formidable 处理
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false, // 禁用响应大小限制
    externalResolver: true, // 告诉 Next.js 这个 API 可能需要较长时间
  },
  maxDuration: 300, // 5分钟超时限制
};

// 解析上传的数据库文件
async function parseMemosDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const diagnostics = []; // 收集诊断信息
    
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(new Error(`无法打开数据库: ${err.message}`));
        return;
      }
    });

    // 确保能读取 WAL 文件中的数据 - 强制关闭并重新打开数据库
    db.close((closeErr) => {
      if (closeErr) {
        console.warn('关闭数据库时出错:', closeErr.message);
      }
      
      // 重新打开数据库，强制合并WAL
      const dbReopen = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          reject(new Error(`重新打开数据库失败: ${err.message}`));
          return;
        }
      });

      dbReopen.serialize(() => {
        // 强制WAL模式并执行完整检查点
        dbReopen.run("PRAGMA journal_mode = WAL;");
        dbReopen.run("PRAGMA wal_checkpoint(RESTART);", (err) => {
          if (err) {
            console.warn('RESTART WAL检查点失败，尝试TRUNCATE:', err.message);
            diagnostics.push(`⚠️ RESTART WAL检查点失败: ${err.message}`);
            
            dbReopen.run("PRAGMA wal_checkpoint(TRUNCATE);", (err2) => {
              if (err2) {
                console.warn('TRUNCATE WAL检查点失败，使用FULL:', err2.message);
                dbReopen.run("PRAGMA wal_checkpoint(FULL);");
                diagnostics.push(`⚠️ 使用FULL WAL检查点作为后备`);
              } else {
                diagnostics.push('✅ TRUNCATE WAL检查点完成');
              }
            });
          } else {
            diagnostics.push('✅ RESTART WAL检查点完成，强制合并所有WAL数据');
          }
        });

        // 设置完全同步并刷新缓存
        dbReopen.run("PRAGMA synchronous = FULL;");
        dbReopen.run("PRAGMA cache_size = -64000;"); // 64MB缓存
        diagnostics.push('✅ 重新打开数据库，强制读取所有WAL数据');

      // 首先获取资源数据
      const resourceQuery = `
        SELECT id, uid, filename, blob, type, size, memo_id
        FROM resource
        ORDER BY id ASC
      `;

      dbReopen.all(resourceQuery, [], (err, resourceRows) => {
        if (err) {
          dbReopen.close();
          reject(new Error(`查询资源失败: ${err.message}`));
          return;
        }

      // 构建资源映射
      const resourcesMap = new Map();
      resourceRows.forEach(row => {
        if (row.memo_id) {
          if (!resourcesMap.has(row.memo_id)) {
            resourcesMap.set(row.memo_id, []);
          }
          resourcesMap.get(row.memo_id).push({
            id: row.id,
            uid: row.uid,
            filename: row.filename,
            blob: row.blob,
            type: row.type,
            size: row.size
          });
        }
      });

      // 先查询所有记录的状态分布用于调试
      const statusQuery = `
        SELECT row_status, COUNT(*) as count 
        FROM memo 
        GROUP BY row_status
      `;
      
      // 同时查询总数确认
      const totalQuery = `SELECT COUNT(*) as total FROM memo`;
      
      dbReopen.all(statusQuery, [], (err, statusRows) => {
        if (err) {
          console.error('查询状态分布失败:', err);
          diagnostics.push(`❌ 查询状态分布失败: ${err.message}`);
        } else {
          console.log('📊 数据库中的记录状态分布:');
          diagnostics.push('📊 数据库中的记录状态分布:');
          let totalInDb = 0;
          statusRows.forEach(row => {
            const msg = `  ${row.row_status}: ${row.count} 条`;
            console.log(msg);
            diagnostics.push(msg);
            totalInDb += row.count;
          });
          const totalMsg = `  总计: ${totalInDb} 条记录`;
          console.log(totalMsg);
          diagnostics.push(totalMsg);
        }
        
        // 确认总数
        dbReopen.get(totalQuery, [], (err, totalRow) => {
          if (!err) {
            const msg = `🔍 直接查询总数确认: ${totalRow.total} 条`;
            console.log(msg);
            diagnostics.push(msg);
          }
        });
        
        // 检查字段完整性
        const fieldCheckQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(id) as has_id,
            COUNT(created_ts) as has_created_ts,
            COUNT(updated_ts) as has_updated_ts,
            COUNT(row_status) as has_row_status
          FROM memo
        `;
        
        dbReopen.get(fieldCheckQuery, [], (err, fieldResult) => {
          if (!err) {
            console.log('📊 字段完整性检查:');
            diagnostics.push('📊 字段完整性检查:');
            const msgs = [
              `  总记录数: ${fieldResult.total}`,
              `  有 id: ${fieldResult.has_id}`,
              `  有 created_ts: ${fieldResult.has_created_ts}`,
              `  有 updated_ts: ${fieldResult.has_updated_ts}`,
              `  有 row_status: ${fieldResult.has_row_status}`
            ];
            msgs.forEach(msg => {
              console.log(msg);
              diagnostics.push(msg);
            });
          }
        });
        
        // 临时诊断：检查所有可能的状态值
        const allStatusQuery = `
          SELECT DISTINCT row_status, COUNT(*) as count
          FROM memo 
          GROUP BY row_status
          ORDER BY count DESC
        `;
        
        dbReopen.all(allStatusQuery, [], (err, allStatusRows) => {
          if (!err) {
            console.log('🔍 完整的状态分布（包括所有状态）:');
            diagnostics.push('🔍 完整的状态分布（包括所有状态）:');
            allStatusRows.forEach(row => {
              const msg = `  "${row.row_status}": ${row.count} 条`;
              console.log(msg);
              diagnostics.push(msg);
            });
          }
        });
        
        // 获取所有状态的 memo 数据（包括所有状态，但优先显示非删除状态）
        const memoQuery = `
          SELECT 
            id, uid, creator_id, created_ts, updated_ts, 
            row_status, content, visibility, pinned, payload
          FROM memo 
          WHERE row_status IN ('NORMAL', 'ARCHIVED', 'PRIVATE', 'PUBLIC', 'PROTECTED')
             OR row_status IS NULL
             OR row_status NOT IN ('DELETED')
          ORDER BY created_ts DESC
        `;
        
        console.log('📋 查询所有非删除状态的记录...');
        diagnostics.push('📋 查询所有非删除状态的记录...');

        dbReopen.all(memoQuery, [], (err, memoRows) => {
          dbReopen.close();

          if (err) {
            reject(new Error(`查询备忘录失败: ${err.message}`));
            return;
          }

          const queryMsg = `🔍 SQL查询返回 ${memoRows.length} 条记录`;
          console.log(queryMsg);
          diagnostics.push(queryMsg);
          
          const memos = [];
          let pinnedCount = 0;
          let totalResourceCount = 0;
          let processedCount = 0;
          let skippedInParsing = 0;
          const skippedRecords = []; // 记录跳过的记录详情

          memoRows.forEach((row, index) => {
            try {
              processedCount++;
              const processMsg = `处理记录 ${processedCount}/${memoRows.length}: ID=${row.id}, status=${row.row_status}`;
              console.log(processMsg);
              if (processedCount <= 10 || processedCount % 20 === 0) { // 只记录前10条和每20条
                diagnostics.push(processMsg);
              }
              
              // 检查必要字段
              if (!row.id) {
                const skipMsg = `⚠️ 跳过无效记录(无ID): row_status=${row.row_status || 'null'}, content=${row.content?.substring(0, 50) || 'null'}`;
                console.warn(skipMsg);
                diagnostics.push(skipMsg);
                skippedRecords.push({reason: '无ID', row_status: row.row_status, content_preview: row.content?.substring(0, 50)});
                skippedInParsing++;
                return;
              }
              
              const pinned = Boolean(row.pinned);
              if (pinned) pinnedCount++;

              // 转换时间戳（memos 使用 Unix 时间戳秒，需要转换为毫秒）
              const createdAt = new Date(row.created_ts * 1000).toISOString();
              const updatedAt = new Date(row.updated_ts * 1000).toISOString();

              // 提取标签
              const tagMatches = (row.content || '').match(/#[\u4e00-\u9fa5\w-]+/g) || [];
              const tags = tagMatches.map(tag => tag.slice(1));

              // 获取资源
              const memoResources = resourcesMap.get(row.id) || [];
              totalResourceCount += memoResources.length;

              // 处理资源为 base64 数据
              const processedResources = memoResources.map(resource => {
                let dataUrl = null;
                if (resource.blob && resource.type && resource.type.startsWith('image/')) {
                  const base64 = Buffer.from(resource.blob).toString('base64');
                  dataUrl = `data:${resource.type};base64,${base64}`;
                }
                return {
                  uid: resource.uid,
                  filename: resource.filename,
                  type: resource.type,
                  size: resource.size,
                  dataUrl: dataUrl
                };
              });

              const memoObj = {
                id: `memos-${row.id}`,
                content: row.content || '',
                tags,
                backlinks: [],
                createdAt,
                updatedAt,
                lastModified: updatedAt,
                timestamp: createdAt,
                processedResources,
                _original: {
                  id: row.id,
                  uid: row.uid,
                  creator_id: row.creator_id,
                  visibility: row.visibility,
                  payload: row.payload,
                  row_status: row.row_status
                }
              };

              memos.push({ memoObj, pinned });
              
            } catch (error) {
              const errorMsg = `❌ 处理记录 ${row?.id || 'unknown'} 时出错: ${error.message}`;
              console.error(errorMsg);
              diagnostics.push(errorMsg);
              skippedRecords.push({reason: '处理错误', id: row?.id, error: error.message});
              skippedInParsing++;
            }
          });

          const parseStatsMsg = `📊 解析统计: 处理了 ${processedCount} 条原始记录，成功解析 ${memos.length} 条，跳过 ${skippedInParsing} 条`;
          console.log(parseStatsMsg);
          diagnostics.push(parseStatsMsg);

          // 统计各种状态的记录
          const statusCounts = {};
          memos.forEach(memo => {
            const status = memo.memoObj._original.row_status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });

          console.log('📊 解析后的记录状态分布:');
          diagnostics.push('📊 解析后的记录状态分布:');
          Object.entries(statusCounts).forEach(([status, count]) => {
            const msg = `  ${status}: ${count} 条`;
            console.log(msg);
            diagnostics.push(msg);
          });

          resolve({
            memos,
            summary: {
              totalMemos: memos.length,
              pinnedMemos: pinnedCount,
              resourceCount: totalResourceCount,
              statusCounts,
              normalMemos: statusCounts.NORMAL || 0,
              archivedMemos: statusCounts.ARCHIVED || 0,
              skippedInParsing,
              processedFromDb: processedCount,
              diagnostics, // 添加诊断信息
              skippedRecords // 添加跳过记录详情
            }
          });
        });
      });
      });
      });
    });
  });
}

// 处理图片引用，将资源嵌入到内容中
function processContentWithResources(content, resources) {
  let updatedContent = content;

  resources.forEach(resource => {
    if (resource.dataUrl) {
      const imageReference = `![${resource.filename}](${resource.dataUrl})`;
      
      // 尝试替换现有引用
      const patterns = [
        new RegExp(`!\\[.*?\\]\\(.*?${resource.uid}.*?\\)`, 'g'),
        new RegExp(`!\\[.*?\\]\\(.*?${resource.filename}.*?\\)`, 'g'),
        new RegExp(`\\[.*?\\]\\(.*?${resource.uid}.*?\\)`, 'g')
      ];

      let foundExisting = false;
      for (const pattern of patterns) {
        if (pattern.test(updatedContent)) {
          updatedContent = updatedContent.replace(pattern, imageReference);
          foundExisting = true;
          break;
        }
      }

      // 如果没有找到现有引用，添加到末尾
      if (!foundExisting && !updatedContent.includes(imageReference)) {
        updatedContent = updatedContent.trim() + '\n\n' + imageReference;
      }
    }
  });

  return updatedContent;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  let tempFilePath = null;

  try {
    // 解析上传的文件
    const form = new IncomingForm({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      uploadDir: path.join(process.cwd(), 'data', 'temp'),
      keepExtensions: true
    });
    
    // 确保临时目录存在
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const [fields, files] = await form.parse(req);

    const uploadedFile = files.database?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ error: '没有上传数据库文件' });
    }

    // 验证文件类型
    if (!uploadedFile.originalFilename?.toLowerCase().endsWith('.db')) {
      return res.status(400).json({ error: '请上传 .db 文件' });
    }

    tempFilePath = uploadedFile.filepath;

    // 处理额外的 WAL 和 SHM 文件
    const walFile = files.wal?.[0];
    const shmFile = files.shm?.[0];

    if (walFile || shmFile) {
      const dbBaseName = tempFilePath.replace(/\.db$/, '');
      
      if (walFile) {
        const walTargetPath = `${dbBaseName}.db-wal`;
        fs.copyFileSync(walFile.filepath, walTargetPath);
        console.log('📂 复制 WAL 文件到:', walTargetPath);
      }
      
      if (shmFile) {
        const shmTargetPath = `${dbBaseName}.db-shm`;
        fs.copyFileSync(shmFile.filepath, shmTargetPath);
        console.log('📂 复制 SHM 文件到:', shmTargetPath);
      }
      
      console.log('✅ 完整数据库文件组合已准备就绪');
    }

    // 解析数据库
    console.log('开始解析数据库文件:', uploadedFile.originalFilename);
    const parseResult = await parseMemosDatabase(tempFilePath);
    console.log('解析完成:', parseResult.summary);
    console.log(`📊 数据库统计: 总计 ${parseResult.summary.totalMemos} 条记录`);
    console.log(`📊 状态分布:`, parseResult.summary.statusCounts);
    console.log(`📊 详情: 置顶 ${parseResult.summary.pinnedMemos} 条, 资源 ${parseResult.summary.resourceCount} 个`);
    if (parseResult.summary.skippedInParsing > 0) {
      console.warn(`⚠️ 解析阶段跳过了 ${parseResult.summary.skippedInParsing} 条记录`);
    }
    
    // 如果有跳过的记录，输出详情
    if (parseResult.summary.skippedRecords && parseResult.summary.skippedRecords.length > 0) {
      console.log('📋 跳过记录详情:');
      parseResult.summary.skippedRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.reason}: ID=${record.id || 'null'}, status=${record.row_status || 'null'}`);
      });
    }

    // 处理图片嵌入
    const processedMemos = parseResult.memos.map(({ memoObj, pinned }) => {
      const updatedContent = processContentWithResources(
        memoObj.content, 
        memoObj.processedResources || []
      );

      return {
        memoObj: {
          ...memoObj,
          content: updatedContent,
          // 保留 dataUrl 用于图片显示，但清理其他较大的原始数据
          processedResources: memoObj.processedResources?.map(r => ({
            uid: r.uid,
            filename: r.filename,
            type: r.type,
            size: r.size,
            dataUrl: r.dataUrl  // 保留 dataUrl，这是图片显示必需的
          }))
        },
        pinned
      };
    });

    // 直接使用数据库实例插入数据，避免 HTTP 超时问题
    const database = getDatabase();
    let insertedCount = 0;
    let pinnedCount = 0;
    let skippedCount = 0;

    // 批量处理，每批处理50条记录，减少内存压力
    const batchSize = 50;
    const totalBatches = Math.ceil(processedMemos.length / batchSize);
    
    console.log(`开始批量导入 ${processedMemos.length} 条记录，分 ${totalBatches} 批处理`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, processedMemos.length);
      const batch = processedMemos.slice(startIndex, endIndex);
      
      console.log(`处理第 ${batchIndex + 1}/${totalBatches} 批 (${startIndex + 1}-${endIndex})`);

      for (const { memoObj, pinned } of batch) {
        try {
          // 检查内容大小，跳过过大的备忘录
          const contentSize = new TextEncoder().encode(memoObj.content).length;
          if (contentSize > 500 * 1024) { // 500KB 限制
            console.warn(`跳过过大的备忘录 (${Math.round(contentSize/1024)}KB): ${memoObj.content.substring(0, 50)}...`);
            skippedCount++;
            continue;
          }

          // 直接调用数据库方法插入
          const insertedMemo = database.createMemo({
            content: memoObj.content,
            tags: memoObj.tags.join(','),
            pinned: pinned,
            createdAt: memoObj.createdAt,
            updatedAt: memoObj.updatedAt
          });

          if (insertedMemo) {
            insertedCount++;
            if (pinned) pinnedCount++;
            if (insertedCount % 10 === 0 || insertedCount === processedMemos.length) {
              console.log(`成功插入备忘录 ${insertedCount}/${processedMemos.length}: ${memoObj.content.substring(0, 50)}...`);
            }
          }
        } catch (error) {
          console.error(`插入备忘录失败:`, error);
          skippedCount++;
        }
      }
      
      // 每批处理完后稍作暂停，释放事件循环
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 最终统计
    console.log(`✅ 导入完成! 成功: ${insertedCount}, 跳过: ${skippedCount}, 总计: ${processedMemos.length}`);
    
    // 返回处理结果，包含详细诊断信息
    res.status(200).json({
      success: true,
      data: {
        insertedCount,
        pinnedCount,
        skippedCount,
        totalProcessed: processedMemos.length,
        summary: parseResult.summary,
        message: `成功导入 ${insertedCount} 条记录${skippedCount > 0 ? `, 跳过 ${skippedCount} 条过大记录` : ''}`,
        diagnostics: parseResult.summary.diagnostics, // 详细诊断信息
        skippedRecords: parseResult.summary.skippedRecords, // 跳过记录详情
        dbDiscrepancy: parseResult.summary.processedFromDb !== insertedCount ? {
          dbTotal: parseResult.summary.processedFromDb,
          parsedTotal: parseResult.summary.totalMemos,
          importedTotal: insertedCount,
          lostInParsing: parseResult.summary.skippedInParsing,
          lostInImport: skippedCount
        } : null
      }
    });

  } catch (error) {
    console.error('数据库解析错误:', error);
    res.status(500).json({ 
      error: `解析失败: ${error.message}` 
    });
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      try {
        // 清理主数据库文件
        fs.unlinkSync(tempFilePath);
        
        // 清理相关的 WAL 和 SHM 文件
        const dbBaseName = tempFilePath.replace(/\.db$/, '');
        const walPath = `${dbBaseName}.db-wal`;
        const shmPath = `${dbBaseName}.db-shm`;
        
        if (fs.existsSync(walPath)) {
          fs.unlinkSync(walPath);
          console.log('🗑️ 清理 WAL 文件:', walPath);
        }
        
        if (fs.existsSync(shmPath)) {
          fs.unlinkSync(shmPath);
          console.log('🗑️ 清理 SHM 文件:', shmPath);
        }
        
      } catch (cleanupError) {
        console.warn('清理临时文件失败:', cleanupError);
      }
    }
  }
}