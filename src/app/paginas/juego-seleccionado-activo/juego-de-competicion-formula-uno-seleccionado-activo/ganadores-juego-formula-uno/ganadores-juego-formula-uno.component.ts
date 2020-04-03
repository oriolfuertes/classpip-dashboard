import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

// Clases
import { Juego, Jornada, TablaJornadas, TablaAlumnoJuegoDeCompeticion,
         TablaEquipoJuegoDeCompeticion, TablaClasificacionJornada, AlumnoJuegoDeCompeticionFormulaUno,
         EquipoJuegoDeCompeticionFormulaUno, AlumnoJuegoDePuntos, EquipoJuegoDePuntos,
         Alumno} from '../../../../clases/index';

// Servicio
import { SesionService , CalculosService, PeticionesAPIService } from '../../../../servicios/index';
import { forEach } from '@angular/router/src/utils/collection';
import { MatTableDataSource } from '@angular/material';

import Swal from 'sweetalert2';



export interface Asignacion {
  modo: string;
  id: number;
}
// Se usará para el selector de modo de asignación de ganadores
const ModoAsignacion: Asignacion[] = [
  {modo: 'Manualmente', id: 1},
  {modo: 'Aleatoriamente', id: 2},
  {modo: 'Juego de Puntos', id: 3},
];

@Component({
  selector: 'app-ganadores-juego-formula-uno',
  templateUrl: './ganadores-juego-formula-uno.component.html',
  styleUrls: ['./ganadores-juego-formula-uno.component.scss']
})
export class GanadoresJuegoDeCompeticionFormulaUnoComponent implements OnInit {
  [x: string]: any;

  juegoSeleccionado: Juego;
  numeroTotalJornadas: number;
  jornadasDelJuego: Jornada[];

  tablaJornada: any [] = [];
  alumnosParticipantes: any [] = [];
  equiposParticipantes: any [] = [];
  ganadoresElegidos: any[] = [];
  dataSourceJornada;
  dataSourceParticipantes;
  dataSourceElegidos;
  columnasJornadaAlumnos: string[] = ['nombre', 'primer', 'segundo', 'puntos'];
  columnasJornadaEquipos: string[] = ['nombre', 'puntos'];
  columnasAlumnosParticipantes: string[] = ['nombre', 'primer', 'segundo', 'pon'];
  columnasAlumnosElegidos: string[] = ['posicion', 'nombre', 'primer', 'segundo', 'quita'];
  columnasEquiposParticipantes: string[] = ['nombre', 'pon'];
  columnasEquiposElegidos: string[] = ['posicion', 'nombre', 'quita'];

  jornadaId: number;

  textoParticipantesPuntuan: string;
  isDisabledAnadirGanadores = true; // Activa/Desactiva botón añadir masivamente ganadores

  modoAsignacion: Asignacion[] = ModoAsignacion;
  modoAsignacionId: number;
  botonAsignarAleatorioDesactivado = true;
  botonAsignarManualDesactivado = true;
  botonAsignarPuntosDesactivado = true;


  juegosActivosPuntos: Juego[];

  juegodePuntosSeleccionadoID: number;
  listaAlumnosOrdenadaPorPuntosJuegoDePuntos: AlumnoJuegoDePuntos[];
  listaEquiposOrdenadaPorPuntosJuegoDePuntos: EquipoJuegoDePuntos[];

  listaAlumnosClasificacion: TablaAlumnoJuegoDeCompeticion[] = [];
  listaEquiposClasificacion: TablaEquipoJuegoDeCompeticion[] = [];
  asignados: boolean;


  constructor(public sesion: SesionService,
              public location: Location,
              public calculos: CalculosService,
              public peticionesAPI: PeticionesAPIService) { }


  ngOnInit() {
    this.juegoSeleccionado = this.sesion.DameJuego();
    this.numeroTotalJornadas = this.juegoSeleccionado.NumeroTotalJornadas;
    const datos = this.sesion.DameDatosJornadas();

    this.jornadasDelJuego = datos.jornadas;
    console.log ('Jornadas');
    console.log (this.jornadasDelJuego);
    if (this.juegoSeleccionado.Modo === 'Individual') {
      this.listaAlumnosClasificacion = this.sesion.DameTablaAlumnoJuegoDeCompeticion();
    } else {
      this.listaEquiposClasificacion = this.sesion.DameTablaEquipoJuegoDeCompeticion();
    }
    // Selecciono los juegos de puntos activos que sean del mosmo modo que el juego de liga (individual o en equipo)
    this.juegosActivosPuntos = this.sesion.DameJuegosDePuntosActivos().filter (juego => juego.Modo === this.juegoSeleccionado.Modo);
    this.asignados = false;
  }

  //////////////////////////////////////// FUNCIONES PARA RECUPERAR INSCRIPCIONES JUEGO DE PUNTOS //////////////////////////////////

  RecuperarInscripcionesAlumnosJuegoPuntos() {
    this.peticionesAPI.DameInscripcionesAlumnoJuegoDePuntos(this.juegodePuntosSeleccionadoID)
    .subscribe(inscripciones => {
      this.listaAlumnosOrdenadaPorPuntosJuegoDePuntos = inscripciones;
      // ordena la lista por puntos
      // tslint:disable-next-line:only-arrow-functions
      this.listaAlumnosOrdenadaPorPuntosJuegoDePuntos = this.listaAlumnosOrdenadaPorPuntosJuegoDePuntos.sort(function(obj1, obj2) {
        return obj2.PuntosTotalesAlumno - obj1.PuntosTotalesAlumno;
      });
    });
  }

  RecuperarInscripcionesEquiposJuegoPuntos() {
    this.peticionesAPI.DameInscripcionesEquipoJuegoDePuntos(this.juegodePuntosSeleccionadoID)
    .subscribe(inscripciones => {
      this.listaEquiposOrdenadaPorPuntosJuegoDePuntos = inscripciones;
      console.log(this.listaEquiposOrdenadaPorPuntosJuegoDePuntos);
      // tslint:disable-next-line:only-arrow-functions
      this.listaEquiposOrdenadaPorPuntosJuegoDePuntos = this.listaEquiposOrdenadaPorPuntosJuegoDePuntos.sort(function(obj1, obj2) {
        return obj2.PuntosTotalesEquipo - obj1.PuntosTotalesEquipo;
      });
    });

  }

  Disputada(jornadaId): boolean {
    return this.calculos.JornadaF1TieneGanadores(jornadaId, this.jornadasDelJuego);
  }

  // Construye la tabla que muestra los resultados de la jornada
  ConstruirTabla() {
    this.tablaJornada = [];
    let i;
    if (this.juegoSeleccionado.Modo === 'Individual') {
      for (i = 0; i < this.listaAlumnosClasificacion.length; i++) {
        const participante: any = [];
        participante.nombre = this.listaAlumnosClasificacion[i].nombre;
        participante.primerApellido = this.listaAlumnosClasificacion[i].primerApellido;
        participante.segundoApellido = this.listaAlumnosClasificacion[i].segundoApellido;
        participante.puntos = 0;
        participante.id = this.listaAlumnosClasificacion[i].id;
        this.tablaJornada.push (participante);
      }
    } else {
      for (i = 0; i < this.listaEquiposClasificacion.length; i++) {
        const participante: any = [];
        participante.nombre = this.listaEquiposClasificacion[i].nombre;
        participante.puntos = 0;
        participante.id = this.listaEquiposClasificacion[i].id;
        this.tablaJornada.push (participante);

      }
    }
  }

  // Añado los puntos correspondientes a los ganadores de la jornada)
  AñadirResultados(ganadores) {
    // ganadores es un vector con los id de los ganadores de la jornada
    // Los puntos que hay que asignar a cada uno de los ganadores, segun su posición, estan en juegoSeleccionado.Puntos

    let i;
    for (i = 0; i < ganadores.length ; i++) {
      this.tablaJornada.filter (participante => participante.id === ganadores[i])[0].puntos = this.juegoSeleccionado.Puntos[i];
    }
    this.tablaJornada.sort ((a , b) => b.puntos - a.puntos);
  }

  // Esta función se ejecuta al seleccionar una jornada
  SeleccionaJornada() {
    this.ConstruirTabla();
    if (this.Disputada(this.jornadaId)) {
      // Si ya se ha disputado, los ganadores están en la información de la jornada
      const ganadores = this.jornadasDelJuego.filter (jornada => jornada.id === Number (this.jornadaId))[0].GanadoresFormulaUno;
      // Añadimos los ganadores a la tabla
      this.AñadirResultados ( ganadores);
    }
    this.dataSourceJornada = new MatTableDataSource (this.tablaJornada);
  }

  // Esta función se ejecuta al seleccionar el modo de asignación
  SeleccionaModo() {
    // activamos el boton correspondiente si se eligió manual ao aleatorio
    if (Number(this.modoAsignacionId) === 1) { // Manual
        this.botonAsignarAleatorioDesactivado = true;
        this.botonAsignarManualDesactivado = false;
        this.botonAsignarPuntosDesactivado = true;
    } else if (Number(this.modoAsignacionId) === 2) { // Aleatorio
        this.botonAsignarManualDesactivado = true;
        this.botonAsignarAleatorioDesactivado = false;
        this.botonAsignarPuntosDesactivado = true;
    // Si se elijió asignación por juego de puntos y no hay juego de puntos para elegir se muestra una alarma
    // Si  hay juego de puntos no se hace nada porque ya aparecerá automáticamente el selector del juego
      } else if (Number(this.modoAsignacionId) === 3 && this.juegosActivosPuntos === undefined) { // JuegoPuntos
        this.botonAsignarManualDesactivado = true;
        this.botonAsignarAleatorioDesactivado = true;
        this.botonAsignarPuntosDesactivado = true;
        Swal.fire('Cuidado', 'No hay juegos de puntos disponibles', 'warning');
      }
  }

  // Cuando se seleccione el juego de puntos entonces activo el botón correspondiente y me traigo las inscripciones
  // para ese juego elegido
  SeleccionarJuegoPuntos() {
    this.botonAsignarManualDesactivado = true;
    this.botonAsignarAleatorioDesactivado = true;
    this.botonAsignarPuntosDesactivado = false;
    if (this.juegoSeleccionado.Modo === 'Individual') {
      this.RecuperarInscripcionesAlumnosJuegoPuntos();
    } else {
      this.RecuperarInscripcionesEquiposJuegoPuntos();
    }
  }

  AsignarGanadoresAleatoriamente() {
    const ganadores: any[] = [];
    const participantes: any[] = [];
    // Preparo la lista de participantes de la que iré eligiendo aleatoriamente
    if (this.juegoSeleccionado.Modo === 'Individual') {
      this.listaAlumnosClasificacion.forEach(alumno => participantes.push(alumno));
    } else {
      this.listaEquiposClasificacion.forEach(equipo => participantes.push(equipo));
    }
    let i = 0;
    while (i < this.juegoSeleccionado.NumeroParticipantesPuntuan) {
      const numeroParticipantes = participantes.length;
      const elegido = Math.floor(Math.random() * numeroParticipantes);
      // guardo el id del elegido
      ganadores.push(participantes[elegido].id);
      // Lo elimino de los participantes para seguir eligiendo
      participantes.splice(elegido, 1);
      i++;
    }
    // Añado puntos de elegidos a la tabla
    this.AñadirResultados ( ganadores);
    this.dataSourceJornada = new MatTableDataSource (this.tablaJornada);
    // Selecciono la jornada implicada
    const jornadaSeleccionada = this.jornadasDelJuego.filter (jornada => jornada.id === Number(this.jornadaId))[0];
    // Asigno los resultados a la jornada
    this.calculos.AsignarResultadosJornadaF1(this.juegoSeleccionado, jornadaSeleccionada, ganadores);
    Swal.fire('Resutados asignados aleatoriamente');
    this.asignados = true;
  }
  AsignarGanadoresJuegoPuntos() {
    const ganadores: any[] = [];

    // Selecciono los ganadores a partir del ranking del juego de puntos
    if (this.juegoSeleccionado.Modo === 'Individual') {
      let i = 0;
      while (i < this.juegoSeleccionado.NumeroParticipantesPuntuan) {
        ganadores.push(this.listaAlumnosOrdenadaPorPuntosJuegoDePuntos[i].alumnoId);
        i++;
      }
    } else {
      let i = 0;
      while (i < this.juegoSeleccionado.NumeroParticipantesPuntuan) {
        ganadores.push(this.listaEquiposOrdenadaPorPuntosJuegoDePuntos[i].equipoId);
        i++;
      }
    }
    // Añado puntos de elegidos a la tabla
    this.AñadirResultados ( ganadores);
    this.dataSourceJornada = new MatTableDataSource (this.tablaJornada);
    // Selecciono la jornada implicada
    const jornadaSeleccionada = this.jornadasDelJuego.filter (jornada => jornada.id === Number(this.jornadaId))[0];
    // Asigno los resultados a la jornada
    this.calculos.AsignarResultadosJornadaF1(this.juegoSeleccionado, jornadaSeleccionada, ganadores);
    Swal.fire('Resutados asignados mediante juego de puntos');
    this.asignados = true;
  }

  // Funciones para AsignarMasivoManualmente
  LimpiarCamposTexto() {
    this.textoParticipantesPuntuan = undefined;
    this.isDisabledAnadirGanadores = true;
  }

  DisabledTexto() {

    if (this.textoParticipantesPuntuan === undefined) {
      this.isDisabledAnadirGanadores = true;
    } else {
      this.isDisabledAnadirGanadores = false;
    }
  }



  AsignarMasivoManualmente() {
    const lineas: string[] = this.textoParticipantesPuntuan.split('\n');
    console.log ('Numero de lineas ' + lineas.length);
    console.log(lineas.length + ' === ' + this.juegoSeleccionado.NumeroParticipantesPuntuan);
    if (lineas.length !== this.juegoSeleccionado.NumeroParticipantesPuntuan) {
      Swal.fire('Esta jornada tiene ' + this.juegoSeleccionado.NumeroParticipantesPuntuan +
      ' participantes que puntúan, pero se han introducido ' + lineas.length,
      ' No se ha podido realizar esta acción', 'error');
    } else {
      let ganadores;
      if (this.juegoSeleccionado.Modo === 'Individual') {
        ganadores = this.calculos.DameIdAlumnos(lineas, this.listaAlumnosClasificacion);
      } else {
        ganadores = this.calculos.DameIdEquipos(lineas, this.listaEquiposClasificacion);
      }
       // Añado puntos de elegidos a la tabla
      this.AñadirResultados ( ganadores);
      this.dataSourceJornada = new MatTableDataSource (this.tablaJornada);
      // Selecciono la jornada implicada
      const jornadaSeleccionada = this.jornadasDelJuego.filter (jornada => jornada.id === Number(this.jornadaId))[0];
      // Asigno los resultados a la jornada
      this.calculos.AsignarResultadosJornadaF1(this.juegoSeleccionado, jornadaSeleccionada, ganadores);
      Swal.fire('Resutados asignados manualmente');
      this.asignados = true;

    }
  }


  cambioTab(tabChangeEvent) {
    if (tabChangeEvent.index === 1) {
      // preparamos las tablas para elegir a los ganadores de la lista de participantes

      this.ganadoresElegidos = [];
      this.dataSourceElegidos = new MatTableDataSource (this.ganadoresElegidos);

      if (this.juegoSeleccionado.Modo === 'Individual') {
        this.alumnosParticipantes = [];
        this.listaAlumnosClasificacion.forEach (alumno => this.alumnosParticipantes.push(alumno));
        this.alumnosParticipantes.sort((a, b) => a.primerApellido.localeCompare(b.primerApellido));
        this.dataSourceParticipantes = new MatTableDataSource (this.alumnosParticipantes);
      } else {
        this.equiposParticipantes = [];
        this.listaEquiposClasificacion.forEach (equipo => this.equiposParticipantes.push(equipo));
        this.equiposParticipantes.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.dataSourceParticipantes = new MatTableDataSource (this.equiposParticipantes);
      }
    } else {
      console.log('Este juego ya tiene ganadores asignados');
      Swal.fire('Esta jornada ya tiene ganadores asignados', ' No se ha podido realizar esta acción', 'error');
    }
  }

  // Si elegimos un ganador lo cambiamos de tabla
  AgregarGanador(participante) {
    if (this.ganadoresElegidos.length === this.juegoSeleccionado.NumeroParticipantesPuntuan) {
      Swal.fire('Cuidado', 'Ya has asignado a todos los participantes que puntuan', 'warning');
    } else {

      this.ganadoresElegidos.push (participante);
      this.dataSourceElegidos = new MatTableDataSource (this.ganadoresElegidos);
      if (this.juegoSeleccionado.Modo === 'Individual') {
        // tslint:disable-next-line:max-line-length
        this.alumnosParticipantes = this.alumnosParticipantes.filter(alumno => alumno.id !== participante.id);
        this.dataSourceParticipantes = new MatTableDataSource (this.alumnosParticipantes);
       } else {
         // tslint:disable-next-line:max-line-length
        this.equiposParticipantes = this.equiposParticipantes.filter(equipo => equipo.id !== participante.id);
        this.dataSourceParticipantes = new MatTableDataSource (this.equiposParticipantes);
      }
    }
  }

  // Si quito un ganador también tengo que cambiar de tabla
  QuitarGanador(participante) {
    this.ganadoresElegidos = this.ganadoresElegidos.filter (elegido => elegido.id !== participante.id);
    this.dataSourceElegidos = new MatTableDataSource (this.ganadoresElegidos);
    if (this.juegoSeleccionado.Modo === 'Individual') {
      this.alumnosParticipantes.push (participante);
      this.alumnosParticipantes.sort((a, b) => a.primerApellido.localeCompare(b.primerApellido));
      this.dataSourceParticipantes = new MatTableDataSource (this.alumnosParticipantes);
    } else {
      this.equiposParticipantes.push (participante);
      this.equiposParticipantes.sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.dataSourceParticipantes = new MatTableDataSource (this.equiposParticipantes);
    }
  }


  // Para asignar los elegidos mediante selección de la lista
  AsignarGanadoresElegidos() {
    if (this.ganadoresElegidos.length < this.juegoSeleccionado.NumeroParticipantesPuntuan) {
      Swal.fire('Cuidado', 'Aún falta asignar alumnos que puntúan', 'warning');
    } else {
      // Preparo el vector con los identificadores de los ganadores
      const ganadores: any[] = [];
      let i = 0;
      while (i < this.juegoSeleccionado.NumeroParticipantesPuntuan) {
        ganadores.push(this.ganadoresElegidos[i].id);
        i++;
      }
     // Añado puntos de elegidos a la tabla
      this.AñadirResultados ( ganadores);
      this.dataSourceJornada = new MatTableDataSource (this.tablaJornada);
    // Selecciono la jornada implicada
      const jornadaSeleccionada = this.jornadasDelJuego.filter (jornada => jornada.id === Number(this.jornadaId))[0];
    // Asigno los resultados a la jornada
      this.calculos.AsignarResultadosJornadaF1(this.juegoSeleccionado, jornadaSeleccionada, ganadores);
      Swal.fire('Resutados asignados manualmente');
      this.asignados = true;
    }
  }

  goBack() {
    if (!this.asignados && !this.Disputada(this.jornadaId)) {
      Swal.fire({
        title: '¿Estas seguro?',
        text: 'No has realizado la asignación',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Si, estoy seguro'
      }).then((result) => {
        if (result.value) {
          this.location.back();
        }
      });
    } else {
      this.location.back();
    }
  }

}