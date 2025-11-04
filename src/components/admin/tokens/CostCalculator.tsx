'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, TrendingUp } from 'lucide-react';
import { AIModel } from '@/services/ai-tokens.service';
import { aiTokensService } from '@/services/ai-tokens.service';
import toast from 'react-hot-toast';

interface CostCalculatorProps {
  models: AIModel[];
}

export function CostCalculator({ models }: CostCalculatorProps) {
  const [tokens, setTokens] = useState<string>('10000');
  const [selectedModel, setSelectedModel] = useState<string>('llama3-8b-8192');
  const [tokenType, setTokenType] = useState<'input' | 'output'>('input');
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);
  const [modelPricing, setModelPricing] = useState<{ input_per_1m: number; output_per_1m: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    const tokenCount = parseInt(tokens);
    
    if (isNaN(tokenCount) || tokenCount <= 0) {
      toast.error('Por favor ingrese un número válido de tokens');
      return;
    }

    setLoading(true);
    try {
      const result = await aiTokensService.calculateCost(tokenCount, selectedModel, tokenType);
      setCalculatedCost(result.cost_usd);
      setModelPricing(result.model_pricing);
      toast.success('Costo calculado exitosamente');
    } catch (error) {
      console.error('Error calculating cost:', error);
      toast.error('Error al calcular el costo');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentModelPricing = () => {
    return models.find(model => model.name === selectedModel);
  };

  const currentModel = getCurrentModelPricing();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Costos
          </CardTitle>
          <CardDescription>
            Calcula el costo estimado para diferentes cantidades de tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tokens">Número de Tokens</Label>
            <Input
              id="tokens"
              type="number"
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              placeholder="Ej: 10000"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un modelo" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.input_cost_formatted} / {model.output_cost_formatted}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Token</Label>
            <div className="flex gap-2">
              <Button
                variant={tokenType === 'input' ? 'default' : 'outline'}
                onClick={() => setTokenType('input')}
                className="flex-1"
              >
                Input
              </Button>
              <Button
                variant={tokenType === 'output' ? 'default' : 'outline'}
                onClick={() => setTokenType('output')}
                className="flex-1"
              >
                Output
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleCalculate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Costo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resultado del Cálculo
          </CardTitle>
          <CardDescription>
            Costo estimado basado en los parámetros seleccionados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculatedCost !== null ? (
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {aiTokensService.formatCost(calculatedCost)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Para {aiTokensService.formatNumber(parseInt(tokens) || 0)} tokens {tokenType}
                </div>
              </div>

              {modelPricing && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Precios del Modelo
                  </h4>
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">Input tokens:</span>
                      <Badge variant="outline">
                        ${modelPricing.input_per_1m.toFixed(2)}/1M
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">Output tokens:</span>
                      <Badge variant="outline">
                        ${modelPricing.output_per_1m.toFixed(2)}/1M
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">Referencias de Costo</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• 1K tokens ≈ 750 palabras</div>
                  <div>• 1M tokens ≈ 750,000 palabras</div>
                  <div>• Los precios varían según el modelo y tipo de token</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ingresa los parámetros y haz clic en &quot;Calcular Costo&quot;</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}