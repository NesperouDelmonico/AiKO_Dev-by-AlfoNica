import { describe, expect, it } from 'vitest'
import { formToParams, paramsToForm } from '../features/exercises/exerciseTypes'
import { copyDay, daysLostOnResize, emptyDays, planToSteps, resizePlan } from '../features/patients/routePlan'

describe('parámetros por tipo', () => {
  it('convierte completar palabras con minutos a segundos', () => {
    const form = { ...paramsToForm('completar_palabras', undefined), frase: ' El gato duerme ', duracion_minutos: '4' }
    expect(formToParams('completar_palabras', form)).toEqual({
      ok: true,
      params: { frase: 'El gato duerme', imagen_id: null, letras_ocultas: 2, duracion_segundos: 240 },
    })
  })

  it('separa palabras clave y exige imagen en recordar imágenes', () => {
    const base = paramsToForm('recordar_imagenes', undefined)
    expect(formToParams('recordar_imagenes', base)).toMatchObject({ ok: false })
    const form = { ...base, tarjetas: [{ imagen_id: 'img', respuestas: 'perro, cachorro ,' }] }
    expect(formToParams('recordar_imagenes', form)).toEqual({
      ok: true,
      params: { imagenes: [{ imagen_id: 'img', respuestas: ['perro', 'cachorro'] }], tiempo_visualizacion_segundos: 8 },
    })
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
