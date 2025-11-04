'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2 } from 'lucide-react';
import type { CreateEntityInput, EntityType } from '@/types/entities';

interface EntityFormProps {
  initialData?: Partial<CreateEntityInput>;
  onSubmit: (data: CreateEntityInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export default function EntityForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create'
}: EntityFormProps) {
  const [formData, setFormData] = useState<CreateEntityInput>({
    name: initialData?.name || '',
    aliases: initialData?.aliases || [],
    type: initialData?.type || 'PERSON',
    description: initialData?.description || '',
    case_sensitive: initialData?.case_sensitive || false,
    exact_match: initialData?.exact_match || false,
    alert_enabled: initialData?.alert_enabled ?? true,
    alert_threshold: initialData?.alert_threshold ?? 0.2,
    // Campos V1 (mantenidos para compatibilidad)
    positive_keywords: initialData?.positive_keywords || [],
    negative_keywords: initialData?.negative_keywords || [],
    // Nuevos campos V2
    analysis_context: initialData?.analysis_context || 'politica_chile',
    positive_phrases: initialData?.positive_phrases || [],
    negative_phrases: initialData?.negative_phrases || [],
  });

  const [currentAlias, setCurrentAlias] = useState('');
  // Estados para frases V2
  const [currentPositivePhrase, setCurrentPositivePhrase] = useState('');
  const [currentNegativePhrase, setCurrentNegativePhrase] = useState('');

  const handleAddAlias = () => {
    const aliases = formData.aliases || [];
    if (currentAlias.trim() && !aliases.includes(currentAlias.trim())) {
      setFormData({
        ...formData,
        aliases: [...aliases, currentAlias.trim()]
      });
      setCurrentAlias('');
    }
  };

  const handleRemoveAlias = (index: number) => {
    const aliases = formData.aliases || [];
    setFormData({
      ...formData,
      aliases: aliases.filter((_, i) => i !== index)
    });
  };



  // Funciones para manejar frases V2
  const handleAddPositivePhrase = () => {
    const phrases = formData.positive_phrases || [];
    if (currentPositivePhrase.trim() && !phrases.includes(currentPositivePhrase.trim())) {
      setFormData({
        ...formData,
        positive_phrases: [...phrases, currentPositivePhrase.trim()]
      });
      setCurrentPositivePhrase('');
    }
  };

  const handleRemovePositivePhrase = (index: number) => {
    const phrases = formData.positive_phrases || [];
    setFormData({
      ...formData,
      positive_phrases: phrases.filter((_, i) => i !== index)
    });
  };

  const handleAddNegativePhrase = () => {
    const phrases = formData.negative_phrases || [];
    if (currentNegativePhrase.trim() && !phrases.includes(currentNegativePhrase.trim())) {
      setFormData({
        ...formData,
        negative_phrases: [...phrases, currentNegativePhrase.trim()]
      });
      setCurrentNegativePhrase('');
    }
  };

  const handleRemoveNegativePhrase = (index: number) => {
    const phrases = formData.negative_phrases || [];
    setFormData({
      ...formData,
      negative_phrases: phrases.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    await onSubmit(formData);
  };

  const typeOptions: Array<{ value: EntityType; label: string; icon: string }> = [
    { value: 'PERSON', label: 'Persona', icon: '👤' },
    { value: 'COMPANY', label: 'Empresa', icon: '🏢' },
    { value: 'TOPIC', label: 'Tema', icon: '📍' },
    { value: 'EVENT', label: 'Evento', icon: '💡' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Crear Nueva Entidad' : 'Editar Entidad'}</CardTitle>
          <CardDescription>
            Define una entidad para monitorear su presencia en las noticias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nombre y Tipo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Antonio Cast"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as EntityType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aliases */}
          <div className="space-y-2">
            <Label htmlFor="alias-input">Variaciones del nombre (Aliases)</Label>
            <CardDescription className="text-xs mb-2">
              Agrega diferentes formas en que puede aparecer el nombre en las noticias
            </CardDescription>
            <div className="flex gap-2">
              <Input
                id="alias-input"
                value={currentAlias}
                onChange={(e) => setCurrentAlias(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAlias();
                  }
                }}
                placeholder="Ej: A. Cast, Antonio C., Cast"
              />
              <Button
                type="button"
                onClick={handleAddAlias}
                variant="outline"
                size="icon"
                disabled={!currentAlias.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Lista de aliases */}
            {(formData.aliases && formData.aliases.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted rounded-lg">
                {formData.aliases!.map((alias, index) => (
                  <Badge key={index} variant="secondary" className="pl-3 pr-1">
                    <span>{alias}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-2 hover:bg-transparent"
                      onClick={() => handleRemoveAlias(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>



          {/* Analyzer V2 - Configuración Avanzada */}
          <Card className="border-dashed border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                🚀 Analyzer V2 - Configuración Avanzada
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Nuevo</Badge>
              </CardTitle>
              <CardDescription>
                Configuración mejorada para análisis de sentimiento con 85-95% de precisión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contexto de Análisis */}
              <div className="space-y-2">
                <Label htmlFor="analysis_context">Contexto de Análisis</Label>
                <CardDescription className="text-xs mb-2">
                  Selecciona el contexto que mejor se adapte a tu entidad
                </CardDescription>
                <Select
                  value={formData.analysis_context}
                  onValueChange={(value) => setFormData({ ...formData, analysis_context: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="politica_chile">
                      <span className="flex items-center gap-2">
                        <span>🏛️</span>
                        <span>Política Chile (Recomendado)</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="personalizado">
                      <span className="flex items-center gap-2">
                        <span>⚙️</span>
                        <span>Personalizado</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frases Positivas V2 */}
              <div className="space-y-2">
                <Label htmlFor="positive-phrase-input">Frases Positivas V2</Label>
                <CardDescription className="text-xs mb-2">
                  Frases completas que indican sentimiento positivo (ej: "logró aprobar", "recibió apoyo")
                </CardDescription>
                <div className="flex gap-2">
                  <Input
                    id="positive-phrase-input"
                    value={currentPositivePhrase}
                    onChange={(e) => setCurrentPositivePhrase(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPositivePhrase();
                      }
                    }}
                    placeholder="Ej: logró aprobar, recibió apoyo, fue elogiado"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPositivePhrase}
                    variant="outline"
                    size="icon"
                    disabled={!currentPositivePhrase.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Lista de frases positivas */}
                {(formData.positive_phrases && formData.positive_phrases.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    {formData.positive_phrases!.map((phrase, index) => (
                      <Badge key={index} variant="secondary" className="pl-3 pr-1 bg-green-100 text-green-800">
                        <span>{phrase}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-2 hover:bg-transparent"
                          onClick={() => handleRemovePositivePhrase(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Frases Negativas V2 */}
              <div className="space-y-2">
                <Label htmlFor="negative-phrase-input">Frases Negativas V2</Label>
                <CardDescription className="text-xs mb-2">
                  Frases completas que indican sentimiento negativo (ej: "fue criticado", "generó polémica")
                </CardDescription>
                <div className="flex gap-2">
                  <Input
                    id="negative-phrase-input"
                    value={currentNegativePhrase}
                    onChange={(e) => setCurrentNegativePhrase(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNegativePhrase();
                      }
                    }}
                    placeholder="Ej: fue criticado, generó polémica, cuestionado por"
                  />
                  <Button
                    type="button"
                    onClick={handleAddNegativePhrase}
                    variant="outline"
                    size="icon"
                    disabled={!currentNegativePhrase.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Lista de frases negativas */}
                {(formData.negative_phrases && formData.negative_phrases.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    {formData.negative_phrases!.map((phrase, index) => (
                      <Badge key={index} variant="secondary" className="pl-3 pr-1 bg-red-100 text-red-800">
                        <span>{phrase}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-2 hover:bg-transparent"
                          onClick={() => handleRemoveNegativePhrase(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Información sobre mejoras V2 */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  <strong>🎯 Mejoras del Analyzer V2:</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
                    <li>Precisión mejorada del 20-30% al 85-95%</li>
                    <li>Detección de negaciones y contradicciones</li>
                    <li>Análisis contextual especializado</li>
                    <li>Reducción de falsos neutrales del 80-90% al 10-20%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opciones de búsqueda */}
          <div className="space-y-3">
            <Label>Opciones de Búsqueda</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="case_sensitive"
                checked={formData.case_sensitive}
                onChange={(e) =>
                  setFormData({ ...formData, case_sensitive: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="case_sensitive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Sensible a mayúsculas
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="exact_match"
                checked={formData.exact_match}
                onChange={(e) =>
                  setFormData({ ...formData, exact_match: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="exact_match"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Coincidencia exacta
              </label>
            </div>
          </div>

          {/* Configuración de Alertas */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuración de Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="alert_enabled"
                  checked={formData.alert_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="alert_enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Activar alertas
                </label>
              </div>

              {formData.alert_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="alert_threshold">
                    Umbral de alerta (0.0 - 1.0)
                  </Label>
                  <Input
                    id="alert_threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.alert_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, alert_threshold: parseFloat(e.target.value) })
                    }
                  />
                  <CardDescription className="text-xs">
                    Valor mínimo de sentimiento para generar alertas. 0.2 = 20% de sentimiento negativo
                  </CardDescription>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'create' ? 'Creando...' : 'Guardando...'}
            </>
          ) : (
            mode === 'create' ? 'Crear Entidad' : 'Guardar Cambios'
          )}
        </Button>
      </div>
    </form>
  );
}
