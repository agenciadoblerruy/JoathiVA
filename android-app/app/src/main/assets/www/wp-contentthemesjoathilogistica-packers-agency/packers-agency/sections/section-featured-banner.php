<?php
/**
 * Banner Section
 * 
 * @package packers_agency
 */
$packers_agency_slider = get_theme_mod( 'packers_agency_slider_setting',false );
$packers_agency_args = array(
  'post_type' => 'post',
  'post_status' => 'publish',
  'category_name' =>  get_theme_mod('packers_agency_blog_slide_category'),
  'posts_per_page' => 3,
); ?>

<?php if ( $packers_agency_slider ){?>
  <div class="banner">
    <div class="owl-carousel">
      <?php $packers_agency_arr_posts = new WP_Query( $packers_agency_args );
      if ( $packers_agency_arr_posts->have_posts() ) :
        while ( $packers_agency_arr_posts->have_posts() ) :
          $packers_agency_arr_posts->the_post();
          ?>
          <div class="banner_inner_box">
            <?php
              if ( has_post_thumbnail() ) :
                the_post_thumbnail();
              else:
                ?>
                <div class="banner_inner_box">
                  <img src="<?php echo get_stylesheet_directory_uri() . '/images/slide.png'; ?>">
                </div>
                <?php
              endif;
            ?>
            <div class="banner_box">
              <?php if ( get_theme_mod('packers_agency_slider_text_extra') ) : ?>
                <h5><?php echo esc_html(get_theme_mod('packers_agency_slider_text_extra'));?></h5>
              <?php endif; ?>
              <h3 class="my-3"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
            </div>
          </div>
        <?php
      endwhile;
      wp_reset_postdata();
      endif; ?>
    </div>
      <?php if(get_theme_mod('packers_agency_slider_shortcode')!=''){ ?>
        <div class="slide_form_shortcode mt-3 wow bounceInDown" data-wow-duration="2s">
          <?php echo do_shortcode(get_theme_mod('packers_agency_slider_shortcode')); ?>
        </div>
      <?php } ?>
  </div>
<?php } ?>