import { describe, expect, it } from 'vitest'
import { formToParams, paramsToForm } from '../features/exercises/exerciseTypes'
import { copyDay, daysLostOnResize, emptyDays, planToSteps, resizePlan } from '../features/patients/routePlan'

describe('parámetros por tipo', () => {
  it('convierte completar palabras: palabras y frases por línea, minutos a segundos', () => {
    const form = { ...paramsToForm('completar_palabras', undefined), palabras: ' casa \n\nmanzana', frases: 'El gato  duerme', duracion_minutos: '4' }
    expect(formToParams('completar_palabras', form)).toEqual({
      ok: true,
      params: { palabras: ['casa', 'manzana'], frases: ['El gato duerme'], imagen_id: null, letras_faltantes: 2, intentos: 3, duracion_segundos: 240 },
    })
    expect(formToParams('completar_palabras', { ...form, palabras: 'el gato' })).toMatchObject({ ok: false })
  })

  it('recordar imágenes: exige imagen y nombres en modo nombrar, no en relacionar', () => {
    const base = paramsToForm('recordar_imagenes', undefined)
    expect(base.tarjetas).toHaveLength(2)
    expect(formToParams('recordar_imagenes', base)).toMatchObject({ ok: false })
    const form = { ...base, tarjetas: [{ imagen_id: 'a', respuestas: 'perro, cachorro ,' }, { imagen_id: 'b', respuestas: '' }] }
    expect(formToParams('recordar_imagenes', form)).toMatchObject({ ok: false })
    expect(formToParams('recordar_imagenes', { ...form, modo: 'relacionar', dibujar: false })).toEqual({
      ok: true,
      params: {
        imagenes: [{ imagen_id: 'a', respuestas: ['perro', 'cachorro'] }, { imagen_id: 'b', respuestas: [] }],
        modo: 'relacionar', dibujar: false, tiempo_visualizacion_segundos: 8, duracion_segundos: 300,
      },
    })
  })

  it('juegos de velocidad y secuencia usan sus valores por defecto', () => {
    expect(formToParams('memoria_secuencias', paramsToForm('memoria_secuencias', undefined))).toEqual({ ok: true, params: { botones: 4, rondas: 6, intentos: 3, tiempo_respuesta_segundos: 15 } })
    expect(formToParams('toque_color', paramsToForm('toque_color', { interferencia: true }))).toEqual({ ok: true, params: { rondas: 15, colores: 4, tiempo_limite_ms: 2500, interferencia: true } })
    expect(formToParams('busca_imagen', paramsToForm('busca_imagen', { cuadricula: 12 }))).toEqual({ ok: true, params: { rondas: 10, tiempo_limite_ms: 6000, cuadricula: 12 } })
  })

  it('reconstruye el formulario de lógica desde parámetros guardados', () => {
    const form = paramsToForm('logica', { preguntas: [{ enunciado: '¿2+2?', opciones: ['3', '4'], correcta: 1 }] })
    expect(form.preguntas[0]).toMatchObject({ enunciado: '¿2+2?', correcta: 1, imagen_id: null })
    expect(formToParams('logica', form)).toMatchObject({ ok: true })
  })
})

describe('plan por días', () => {
  it('redimensiona, copia y numera los pasos por día', () => {
    let plan = resizePlan([['a', 'b']], 7)
    expect(emptyDays(plan)).toEqual([2, 3, 4, 5, 6, 7])
    plan = copyDay(plan, 0, true)
    expect(emptyDays(plan)).toEqual([])
    expect(planToSteps(resizePlan(plan, 2))).toEqual([
      { ejercicio_id: 'a', orden: 1, dia: 1 },
      { ejercicio_id: 'b', orden: 2, dia: 1 },
      { ejercicio_id: 'a', orden: 3, dia: 2 },
      { ejercicio_id: 'b', orden: 4, dia: 2 },
    ])
    expect(daysLostOnResize(plan, 1)).toEqual([2, 3, 4, 5, 6, 7])
  })
})
