import React from 'react';
import { Play, Square, RotateCcw, Activity, Clock, AlertTriangle } from 'lucide-react';
import { ScraperStatus as ScraperStatusType } from '../../types/dashboard';
import { useScrapers } from '../../contexts/ScraperContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScraperCardProps {
  scraper: ScraperStatusType;
}

const ScraperCard: React.FC<ScraperCardProps> = ({ scraper }) => {
  const { startScraper, stopScraper, runOnce } = useScrapers();

  const getStatusConfig = (status: ScraperStatusType['status']) => {
    const configs = {
      'ONLINE_ACTIVE': {
        color: 'bg-green-500',
        textColor: 'text-green-800',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: '🟢',
        text: 'Online & Ativo',
        animation: 'animate-pulse-slow'
      },
      'ONLINE_IDLE': {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-800', 
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: '🟡',
        text: 'Online mas Idle',
        animation: ''
      },
      'OFFLINE': {
        color: 'bg-red-500',
        textColor: 'text-red-800',
        bgColor: 'bg-red-50', 
        borderColor: 'border-red-200',
        icon: '🔴',
        text: 'Offline',
        animation: 'animate-ping-slow'
      },
      'ERROR': {
        color: 'bg-gray-700',
        textColor: 'text-gray-800',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200', 
        icon: '⚫',
        text: 'Erro',
        animation: 'animate-bounce'
      },
      'STARTING': {
        color: 'bg-blue-500',
        textColor: 'text-blue-800',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: '🔵', 
        text: 'Iniciando',
        animation: 'animate-pulse'
      }
    };
    return configs[status];
  };

  const statusConfig = getStatusConfig(scraper.status);
  const lastSeen = scraper.lastHeartbeat ? new Date(scraper.lastHeartbeat) : null;
  const lastActivity = scraper.lastActivity ? new Date(scraper.lastActivity) : null;

  return (
    <div className={`p-6 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header com Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${statusConfig.color} ${statusConfig.animation}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900 truncate">{scraper.name}</h3>
            <span className={`text-sm ${statusConfig.textColor}`}>{statusConfig.text}</span>
          </div>
        </div>
        <span className="text-2xl">{statusConfig.icon}</span>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{scraper.metrics.ridesScraped}</div>
          <div className="text-sm text-gray-600">Rides</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{scraper.metrics.driversScraped}</div>
          <div className="text-sm text-gray-600">Drivers</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">{scraper.metrics.successRate}%</div>
          <div className="text-sm text-gray-600">Taxa Sucesso</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-red-600">{scraper.metrics.errorsCount}</div>
          <div className="text-sm text-gray-600">Erros</div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          <span>
            Último heartbeat: {lastSeen ? formatDistanceToNow(lastSeen, { addSuffix: true, locale: ptBR }) : 'Nunca'}
          </span>
        </div>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          <span>
            Última atividade: {lastActivity ? formatDistanceToNow(lastActivity, { addSuffix: true, locale: ptBR }) : 'Nunca'}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex space-x-2">
        <button
          onClick={() => startScraper(scraper.id)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          disabled={scraper.status === 'ONLINE_ACTIVE'}
        >
          <Play className="w-4 h-4 mr-1" />
          Start
        </button>
        
        <button
          onClick={() => stopScraper(scraper.id)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          disabled={scraper.status === 'OFFLINE'}
        >
          <Square className="w-4 h-4 mr-1" />
          Stop
        </button>
        
        <button
          onClick={() => runOnce(scraper.id)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Run
        </button>
      </div>

      {/* Alertas de Status */}
      {scraper.status === 'ERROR' && (
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded flex items-center">
          <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
          <span className="text-sm text-red-800">Scraper com problemas - verificar logs</span>
        </div>
      )}

      {scraper.status === 'OFFLINE' && (
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded flex items-center">
          <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
          <span className="text-sm text-red-800">Scraper offline - heartbeat perdido</span>
        </div>
      )}
    </div>
  );
};

export default ScraperCard;
