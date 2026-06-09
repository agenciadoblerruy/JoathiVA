<?php
/**
 * Template Name: Operativa
 *
 * @package packers_agency
 */

get_header();
set_query_var(
	'packers_agency_corporate_page',
	array(
		'eyebrow' => __( 'Operativa', 'packers-agency' ),
		'title'   => __( 'El flujo operativo diario queda visible, trazable y listo para revisión.', 'packers-agency' ),
		'intro'   => __( 'La operativa se centra en tareas, actividades, operaciones y documentos, con una lógica clara para revisar el estado de cada caso.', 'packers-agency' ),
		'buttons' => array(
			array(
				'label' => __( 'Abrir JoathiVA', 'packers-agency' ),
				'url'   => home_url( '/v/' ),
				'class' => 'joathi-btn-primary',
			),
			array(
				'label' => __( 'Volver a servicios', 'packers-agency' ),
				'url'   => home_url( '/servicios/' ),
				'class' => 'joathi-btn-secondary',
			),
		),
		'cards'   => array(
			array(
				'eyebrow' => __( 'Tareas', 'packers-agency' ),
				'title'   => __( 'Acciones pendientes', 'packers-agency' ),
				'text'    => __( 'Cada pendiente operativo queda con prioridad, fecha y responsable.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Actividades', 'packers-agency' ),
				'title'   => __( 'Trazabilidad', 'packers-agency' ),
				'text'    => __( 'El intercambio con clientes, proveedores y despachantes queda registrado.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Operaciones', 'packers-agency' ),
				'title'   => __( 'Checklist y estado', 'packers-agency' ),
				'text'    => __( 'Se controla el avance, el riesgo y los documentos vinculados sin duplicar expedientes.', 'packers-agency' ),
			),
		),
		'steps'   => array(
			array(
				'step'  => '01',
				'title' => __( 'Intake', 'packers-agency' ),
				'text'  => __( 'Entrada por correo o carga manual.', 'packers-agency' ),
			),
			array(
				'step'  => '02',
				'title' => __( 'Clasificación', 'packers-agency' ),
				'text'  => __( 'Matching de cliente y tipo de caso.', 'packers-agency' ),
			),
			array(
				'step'  => '03',
				'title' => __( 'Ejecución', 'packers-agency' ),
				'text'  => __( 'Se crean o actualizan tareas, actividades y operación.', 'packers-agency' ),
			),
			array(
				'step'  => '04',
				'title' => __( 'Cierre', 'packers-agency' ),
				'text'  => __( 'El expediente queda listo para revisión humana.', 'packers-agency' ),
			),
		),
		'cta'     => array(
			'eyebrow' => __( 'Portal', 'packers-agency' ),
			'title'   => __( 'Seguimiento operativo desde una sola entrada.', 'packers-agency' ),
			'text'    => __( 'La web corporativa y JoathiVA quedan alineadas para que el equipo no cambie de contexto.', 'packers-agency' ),
			'buttons' => array(
				array(
					'label' => __( 'JoathiVA', 'packers-agency' ),
					'url'   => home_url( '/v/' ),
					'class' => 'joathi-btn-primary',
				),
			),
		),
	)
);
get_template_part( 'template-parts/corporate-page' );
get_footer();
