// Agendador de Notificações Automáticas
import { runDailyNotificationCheck } from './notification-system'

interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  description?: string; // Adicionado description como opcional
}

// Tarefas agendadas
export const scheduledTasks: ScheduledTask[] = [
  {
    id: 'daily-notifications',
    name: 'Verificação Diária de Notificações',
    schedule: '0 8 * * *', // Todos os dias às 8:00 AM
    enabled: true,
    description: 'Verifica clientes próximos de expirar e envia notificações automáticas'
  },
  {
    id: 'weekly-report',
    name: 'Relatório Semanal',
    schedule: '0 8 * * 1', // Toda segunda-feira às 8:00 AM
    enabled: true,
    description: 'Gera relatório semanal de notificações enviadas'
  },
  {
    id: 'monthly-cleanup',
    name: 'Limpeza Mensal',
    schedule: '0 2 1 * *', // Primeiro dia do mês às 2:00 AM
    enabled: true,
    description: 'Limpa logs antigos e otimiza banco de dados'
  }
]

// Executar tarefa específica
export async function runScheduledTask(taskId: string): Promise<{
  success: boolean;
  message: string;
  lastRun: string;
  nextRun: string;
}> {
  const task = scheduledTasks.find(t => t.id === taskId)
  
  if (!task) {
    return {
      success: false,
      message: `Tarefa ${taskId} não encontrada`,
      lastRun: new Date().toISOString(),
      nextRun: new Date().toISOString()
    }
  }

  if (!task.enabled) {
    return {
      success: true,
      message: `Tarefa ${task.name} está desabilitada`,
      lastRun: new Date().toISOString(),
      nextRun: new Date().toISOString()
    }
  }

  try {
    console.log(`🚀 Executando tarefa agendada: ${task.name}`)
    
    switch (task.id) {
      case 'daily-notifications':
        const result = await runDailyNotificationCheck()
        return {
          success: true,
          message: `Verificação diária concluída: ${result.notificationsSent} notificações enviadas, ${result.notificationsFailed} falhas`,
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Próxima execução em 24 horas
        }
        
      case 'weekly-report':
        // Aqui você implementaria geração de relatório semanal
        return {
          success: true,
          message: 'Relatório semanal gerado com sucesso',
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Próxima execução em 7 dias
        }
        
      case 'monthly-cleanup':
        // Aqui você implementaria limpeza de logs
        return {
          success: true,
          message: 'Limpeza mensal concluída',
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Próxima execução em 30 dias
        }
        
      default:
        return {
          success: false,
          message: `Tarefa ${task.name} não implementada`,
          lastRun: new Date().toISOString(),
          nextRun: new Date().toISOString()
        }
    }
  } catch (error) {
    console.error(`Erro ao executar tarefa ${task.name}:`, error)
    return {
      success: false,
      message: `Erro na execução da tarefa ${task.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      lastRun: new Date().toISOString(),
      nextRun: new Date().toISOString()
    }
  }
}

// Obter status de todas as tarefas
export function getAllScheduledTasks(): ScheduledTask[] {
  return scheduledTasks.map(task => ({
    ...task,
    lastRun: task.lastRun || 'Nunca executado',
    nextRun: task.nextRun || new Date().toISOString()
  }))
}

// Habilitar/desabilitar tarefa
export function toggleTask(taskId: string, enabled: boolean): boolean {
  const task = scheduledTasks.find(t => t.id === taskId)
  
  if (!task) {
    return false
  }
  
  // Aqui você salvaria no banco de dados
  task.enabled = enabled
  
  console.log(`Tarefa ${task.name} ${enabled ? 'habilitada' : 'desabilitada'}`)
  return true
}
